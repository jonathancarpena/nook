-- Apply in Supabase SQL Editor or `supabase db push`.
-- Only the server's service role may mutate authoritative state. Public clients
-- subscribe to revision numbers, then fetch a redacted API representation.
create table public.tournament_state (
  id text primary key check (id in ('live','demo')),
  version bigint not null check (version >= 0),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  check ((data->>'version')::bigint = version),
  check (data->>'id' = id)
);
create table public.tournaments (
  id text primary key references public.tournament_state(id),
  title text not null default 'THE HALLOWEEN GAMES',
  status text not null check (status in ('registration','active','completed')),
  current_round integer not null check(current_round between 0 and 4),
  registration_open boolean not null,
  maximum_contestants integer not null default 24 check(maximum_contestants=24),
  updated_at timestamptz not null default now()
);
create table public.contestants (
  id uuid primary key,
  tournament_id text not null references public.tournaments(id) on delete cascade,
  name text not null check(char_length(name) between 2 and 60),
  contestant_number integer not null check(contestant_number between 1 and 24),
  guest_token_hash text not null,
  registered_at timestamptz not null,
  unique(tournament_id,contestant_number),
  unique(tournament_id,guest_token_hash)
);
create table public.rounds (
  id text primary key,
  tournament_id text not null references public.tournaments(id) on delete cascade,
  round_number integer not null check(round_number between 1 and 4),
  game_name text not null,
  locked boolean not null,
  confirmed boolean not null,
  results_revealed boolean not null,
  participants jsonb not null,
  unique(tournament_id,round_number),
  check(game_name=case round_number when 1 then 'Mummy Mayhem' when 2 then 'Charades' when 3 then 'Ghost Breath' else 'Traitors Trial' end)
);
create table public.matches (
  id text primary key,
  round_id text not null references public.rounds(id) on delete cascade,
  match_number integer not null check(match_number in (1,2)),
  winning_team_id uuid,
  unique(round_id,match_number)
);
create table public.teams (
  id uuid primary key,
  round_id text not null references public.rounds(id) on delete cascade,
  team_label text not null,
  match_id text references public.matches(id) on delete cascade
);
alter table public.matches add constraint winning_team_fk foreign key(winning_team_id) references public.teams(id) on delete set null deferrable initially deferred;
create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  round_id text not null references public.rounds(id) on delete cascade,
  contestant_id uuid not null references public.contestants(id) on delete cascade,
  primary key(team_id,contestant_id),
  unique(round_id,contestant_id)
);
create table public.results (
  round_id text not null references public.rounds(id) on delete cascade,
  contestant_id uuid not null references public.contestants(id) on delete cascade,
  outcome text not null check(outcome in ('survivor','eliminated')),
  confirmed_at timestamptz not null default now(),
  primary key(round_id,contestant_id)
);
create table public.display_state (
  tournament_id text primary key references public.tournaments(id) on delete cascade,
  current_scene text not null,
  effect_id text not null,
  reveal_state jsonb not null,
  updated_at timestamptz not null default now()
);
create table public.timer_state (
  tournament_id text primary key references public.tournaments(id) on delete cascade,
  data jsonb not null
);
create table public.tournament_events (
  tournament_id text not null references public.tournament_state(id),
  request_id uuid not null,
  version bigint not null,
  kind text not null,
  previous jsonb not null,
  created_at timestamptz not null default now(),
  primary key(tournament_id,request_id),
  unique(tournament_id,version)
);
create table public.public_revision (
  id text primary key references public.tournament_state(id),
  version bigint not null,
  updated_at timestamptz not null default now()
);
-- All projections and history are private. No policies means no guest access.
do $$ declare t text; begin
  foreach t in array array['tournament_state','tournaments','contestants','rounds','matches','teams','team_members','results','display_state','timer_state','tournament_events','public_revision'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;
grant select on public.public_revision to anon,authenticated;
create policy "Live revision notifications only" on public.public_revision for select to anon,authenticated using(id='live');
create or replace function public.commit_tournament(p_id text,p_expected bigint,p_data jsonb,p_previous jsonb,p_request uuid,p_kind text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare old_data jsonb; item jsonb; rd jsonb; tm jsonb; member text; rid text; mid text; n integer; player text;
begin
  if p_id not in ('live','demo') then raise exception 'Invalid tournament'; end if;
  perform pg_advisory_xact_lock(hashtext('halloween:'||p_id));
  if exists(select 1 from tournament_events where tournament_id=p_id and request_id=p_request) then return false; end if;
  select data into old_data from tournament_state where id=p_id for update;
  if coalesce((old_data->>'version')::bigint,0)<>p_expected then return false; end if;
  if p_data->>'id'<>p_id or (p_data->>'version')::bigint<>p_expected+1 or jsonb_array_length(p_data->'contestants')>24 then raise exception 'Invalid state';end if;
  -- Existing assigned numbers are immutable, including during corrections.
  if exists(select 1 from jsonb_array_elements(coalesce(old_data->'contestants','[]')) a join jsonb_array_elements(p_data->'contestants') b on a->>'id'=b->>'id' where a->>'number'<>b->>'number') then raise exception 'Numbers are immutable';end if;
  insert into tournament_state(id,version,data) values(p_id,p_expected+1,p_data) on conflict(id) do update set version=excluded.version,data=excluded.data,updated_at=now();
  insert into tournament_events(tournament_id,request_id,version,kind,previous) values(p_id,p_request,p_expected+1,p_kind,coalesce(old_data,p_previous));
  -- Rebuild the small normalized projection inside the same transaction.
  delete from tournaments where id=p_id;
  insert into tournaments(id,status,current_round,registration_open) values(p_id,p_data->>'status',(p_data->>'round')::integer,(p_data->>'registrationOpen')::boolean);
  for item in select * from jsonb_array_elements(p_data->'contestants') loop
    insert into contestants(id,tournament_id,name,contestant_number,guest_token_hash,registered_at) values((item->>'id')::uuid,p_id,item->>'name',(item->>'number')::integer,item->>'tokenHash',(item->>'registeredAt')::timestamptz);
  end loop;
  for rd in select * from jsonb_array_elements(p_data->'rounds') loop
    n:=(rd->>'number')::integer;rid:=p_id||':'||n;
    if jsonb_array_length(rd->'participants')<>(case n when 1 then 24 when 2 then 12 when 3 then 6 else 3 end) then raise exception 'Invalid round size';end if;
    insert into rounds values(rid,p_id,n,case n when 1 then 'Mummy Mayhem' when 2 then 'Charades' when 3 then 'Ghost Breath' else 'Traitors Trial' end,(rd->>'locked')::boolean,(rd->>'confirmed')::boolean,(rd->>'resultsRevealed')::boolean,rd->'participants');
    if n=2 and jsonb_array_length(rd->'teams')>0 then
      insert into matches(id,round_id,match_number) values(rid||':1',rid,1),(rid||':2',rid,2);
    end if;
    for tm in select * from jsonb_array_elements(rd->'teams') loop
      if jsonb_array_length(tm->'members')<>(case n when 1 then 2 when 2 then 3 else 1 end) then raise exception 'Invalid team size';end if;
      mid:=case when n=2 then rid||':'||(tm->>'match') else null end;
      insert into teams values((tm->>'id')::uuid,rid,tm->>'label',mid);
      for member in select jsonb_array_elements_text(tm->'members') loop
        if not (rd->'participants' ? member) then raise exception 'Invalid participant';end if;
        insert into team_members values((tm->>'id')::uuid,rid,member::uuid);
      end loop;
      if n=2 and (rd->>'confirmed')::boolean and rd->'selected' ? (tm->>'id') then
        update matches set winning_team_id=(tm->>'id')::uuid where id=mid and winning_team_id is null;
        if not found then raise exception 'Only one winner per match';end if;
      end if;
    end loop;
    if (rd->>'confirmed')::boolean then
      if jsonb_array_length(rd->'winners')<>(case n when 1 then 12 when 2 then 6 when 3 then 3 else 1 end) then raise exception 'Invalid winner count';end if;
      for player in select jsonb_array_elements_text(rd->'participants') loop
        insert into results(round_id,contestant_id,outcome) values(rid,player::uuid,case when rd->'winners' ? player then 'survivor' else 'eliminated' end);
      end loop;
    end if;
  end loop;
  insert into display_state(tournament_id,current_scene,effect_id,reveal_state) values(p_id,p_data->>'scene',p_data->>'effectId',p_data->'rounds');
  insert into timer_state values(p_id,p_data->'timer');
  insert into public_revision(id,version) values(p_id,p_expected+1) on conflict(id) do update set version=excluded.version,updated_at=now();
  return true;
end $$;
revoke all on function public.commit_tournament(text,bigint,jsonb,jsonb,uuid,text) from public,anon,authenticated;
grant execute on function public.commit_tournament(text,bigint,jsonb,jsonb,uuid,text) to service_role;
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.public_revision;
  end if;
end $$;

create table public.display_presence (
  id text primary key check(id in ('live','demo')),
  seen_at timestamptz not null
);
alter table public.display_presence enable row level security;
revoke all on public.display_presence from anon,authenticated;
grant all on public.display_presence to service_role;
