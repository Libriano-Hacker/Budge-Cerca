begin;
revoke create on schema public from public,anon,authenticated;

create table if not exists public.tbc_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin')),
  neighborhoods text[] not null default '{}',
  created_at timestamptz not null default now()
);
create table if not exists public.tbc_catalog (
  id integer primary key check(id=1), data jsonb not null,
  revision bigint not null default 1 check(revision>0), updated_at timestamptz not null default now()
);
insert into public.tbc_catalog(id,data) values(1,
'{"version":1,"neighborhoodEdition":2,"neighborhoods":["Barrio Centro"],"settings":{"appName":"Tu Barrio Cerca","neighborhood":"Barrio Centro","ownerWhatsapp":"5491150186306","intro":"Los comercios de siempre. Nuevos lugares por descubrir. Encontrá lo que necesitás y apoyá a quienes hacen tu barrio."},"categories":["Panaderías","Gastronomía","Almacenes y kioscos","Moda","Peluquerías","Barberías","Centros de spa","Farmacias","Veterinarias","Ferreterías","Automotor","Servicios"],"businesses":[]}') on conflict(id) do nothing;
create table if not exists public.tbc_businesses (
  id text primary key, neighborhood text not null,
  published jsonb, draft jsonb, revision bigint not null default 1,
  archived boolean not null default false, updated_at timestamptz not null default now()
);
create table if not exists public.tbc_history (
  id uuid primary key default gen_random_uuid(), business_id text not null references public.tbc_businesses(id),
  revision bigint not null, action text not null check(action in ('draft','publish','restore','archive')),
  payload jsonb not null, actor uuid not null references auth.users(id), created_at timestamptz not null default now(),
  unique(business_id,revision)
);
create table if not exists public.tbc_requests (
  id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('new','correction')),
  business_id text, neighborhood text not null, payload jsonb not null,
  status text not null default 'pending' check(status in ('pending','needs_changes','approved','rejected')),
  revision bigint not null default 1, review_note text not null default '',
  reviewed_by uuid references auth.users(id), created_at timestamptz not null default now(), reviewed_at timestamptz
);
create table if not exists public.tbc_quotas (
  key text primary key, count integer not null, resets_at timestamptz not null
);
create table if not exists public.tbc_nonces (id uuid primary key, expires_at timestamptz not null);
create table if not exists public.tbc_media (
  id uuid primary key, neighborhood text not null, actor uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists tbc_businesses_neighborhood on public.tbc_businesses(neighborhood);
create index if not exists tbc_history_business on public.tbc_history(business_id,created_at desc);
create index if not exists tbc_requests_status on public.tbc_requests(status,neighborhood,created_at desc);
alter table public.tbc_members enable row level security;
alter table public.tbc_catalog enable row level security;
alter table public.tbc_businesses enable row level security;
alter table public.tbc_history enable row level security;
alter table public.tbc_requests enable row level security;
alter table public.tbc_quotas enable row level security;
alter table public.tbc_nonces enable row level security;
alter table public.tbc_media enable row level security;
revoke all on table public.tbc_members,public.tbc_catalog,public.tbc_businesses,public.tbc_history,public.tbc_requests,public.tbc_quotas,public.tbc_nonces,public.tbc_media from public,anon,authenticated;

create or replace function public.tbc_can_manage(p_neighborhood text,p_actor uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=pg_catalog,public,auth as $$
  select exists(select 1 from public.tbc_members where user_id=p_actor and (role='owner' or p_neighborhood=any(neighborhoods)));
$$;
create or replace function public.tbc_is_owner(p_actor uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=pg_catalog,public,auth as $$
  select exists(select 1 from public.tbc_members where user_id=p_actor and role='owner');
$$;
create or replace function public.tbc_access() returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public,auth as $$
declare m public.tbc_members;
begin
 select * into m from public.tbc_members where user_id=auth.uid();
 if not found then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
 if exists(select 1 from auth.mfa_factors where user_id=auth.uid() and status='verified' and factor_type='totp') and coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then raise exception 'MFA_REQUIRED' using errcode='42501'; end if;
 return jsonb_build_object('role',m.role,'neighborhoods',to_jsonb(m.neighborhoods));
end $$;
create or replace function public.tbc_text(v jsonb, lo integer, hi integer) returns boolean language sql immutable as $$
 select coalesce(jsonb_typeof(v)='string' and length(v#>>'{}')<=hi and length(btrim(v#>>'{}'))>=lo and (v#>>'{}') !~ '[[:cntrl:]]',false);
$$;
create or replace function public.tbc_url(v jsonb) returns boolean language sql immutable as $$
 select public.tbc_text(v,1,2048) and (v#>>'{}') ~ '^https://[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z])([/?#]|$)' and (v#>>'{}') !~ '(^https://[^/]*[@:]|[[:space:]])' and (v#>>'{}') !~* '^https://([^/]+\.)?(localhost|local|internal|lan|test|invalid)([/?#]|$)';
$$;
create or replace function public.tbc_valid_business(b jsonb, meta jsonb) returns boolean
language plpgsql stable set search_path=pg_catalog,public as $$
declare d jsonb; x jsonb; y jsonb; vals text[]; n integer;
begin
 if jsonb_typeof(b)<>'object' or b-ARRAY['id','name','category','description','address','whatsapp','hours','coordinates','featured','promotion','color','initials','imageUrl','neighborhood','details']<>'{}'::jsonb or not b ?& ARRAY['id','name','category','description','address','whatsapp','hours','coordinates','featured','promotion','color','initials','neighborhood'] then return false; end if;
 if not public.tbc_text(b->'id',1,100) or b->>'id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$' or not public.tbc_text(b->'name',1,70) or not public.tbc_text(b->'category',1,50) or not (meta->'categories') ? (b->>'category') or not public.tbc_text(b->'neighborhood',1,60) or not (meta->'neighborhoods') ? (b->>'neighborhood') or jsonb_typeof(b->'description')<>'string' or length(b->>'description') not between 1 and 450 or not public.tbc_text(b->'address',1,120) or not public.tbc_text(b->'whatsapp',0,25) or (b->>'whatsapp'<>'' and (b->>'whatsapp' !~ '^\+?[0-9 ()-]+$' or regexp_replace(b->>'whatsapp','[^0-9]','','g') !~ '^[1-9][0-9]{7,14}$')) or jsonb_typeof(b->'promotion')<>'string' or length(b->>'promotion')>300 or b->>'color' not in ('sand','sage','rose','blue','lilac','peach') or not public.tbc_text(b->'initials',0,8) or jsonb_typeof(b->'featured')<>'boolean' then return false; end if;
 if b ? 'imageUrl' and b->>'imageUrl'<>'' and not public.tbc_url(b->'imageUrl') then return false; end if;
 x=b->'coordinates';
 if jsonb_typeof(x)<>'object' or x-ARRAY['lat','lng']<>'{}'::jsonb or not x ?& ARRAY['lat','lng'] or jsonb_typeof(x->'lat')<>'number' or jsonb_typeof(x->'lng')<>'number' or abs((x->>'lat')::numeric)>90 or abs((x->>'lng')::numeric)>180 then return false; end if;
 if jsonb_typeof(b->'hours')<>'array' or jsonb_array_length(b->'hours')>28 then return false; end if;
 for x in select value from jsonb_array_elements(b->'hours') loop
  if jsonb_typeof(x)<>'object' or x-ARRAY['days','opens','closes']<>'{}'::jsonb or not x ?& ARRAY['days','opens','closes'] or jsonb_typeof(x->'days')<>'array' or jsonb_array_length(x->'days') not between 1 and 7 or (select count(distinct value) from jsonb_array_elements(x->'days'))<>jsonb_array_length(x->'days') or coalesce(x->>'opens','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or coalesce(x->>'closes','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or x->>'opens'=x->>'closes' then return false; end if;
  for y in select value from jsonb_array_elements(x->'days') loop if jsonb_typeof(y)<>'number' or (y#>>'{}') !~ '^[0-6]$' then return false; end if; end loop;
 end loop;
 if not b ? 'details' then return true; end if;
 d=b->'details';
 if jsonb_typeof(d)<>'object' or d-ARRAY['services','photos','features','exceptions','review','publishedAt']<>'{}'::jsonb then return false; end if;
 if d ? 'services' then
  if jsonb_typeof(d->'services')<>'array' or jsonb_array_length(d->'services')>24 then return false; end if;
  vals='{}';
  for x in select value from jsonb_array_elements(d->'services') loop
   if jsonb_typeof(x)<>'object' or x-ARRAY['name','description','price','unit','priceNote']<>'{}'::jsonb or not public.tbc_text(x->'name',1,80) or lower(trim(x->>'name'))=any(vals) or (x ? 'description' and (jsonb_typeof(x->'description')<>'string' or length(x->>'description')>180)) or (x ? 'price' and (jsonb_typeof(x->'price')<>'number' or (x->>'price')::numeric<0 or (x->>'price')::numeric>1000000000 or round((x->>'price')::numeric,2)<>(x->>'price')::numeric)) or (x ? 'unit' and not public.tbc_text(x->'unit',0,35)) or (x ? 'priceNote' and (jsonb_typeof(x->'priceNote')<>'string' or length(x->>'priceNote')>180)) then return false; end if;
   vals=array_append(vals,lower(trim(x->>'name')));
  end loop;
 end if;
 if d ? 'features' then
  if jsonb_typeof(d->'features')<>'array' or jsonb_array_length(d->'features')>7 or (select count(distinct value) from jsonb_array_elements(d->'features'))<>jsonb_array_length(d->'features') then return false; end if;
  for x in select value from jsonb_array_elements(d->'features') loop if jsonb_typeof(x)<>'string' or x#>>'{}' not in ('appointments','delivery','home_service','accessible','card','transfer','cash') then return false; end if; end loop;
 end if;
 if d ? 'photos' then
  if jsonb_typeof(d->'photos')<>'array' or jsonb_array_length(d->'photos')>8 then return false; end if;
  for x in select value from jsonb_array_elements(d->'photos') loop
   if jsonb_typeof(x)<>'object' or x-ARRAY['url','assetId','alt']<>'{}'::jsonb or not public.tbc_text(x->'alt',1,120) or not ((x ? 'url' and not x ? 'assetId' and public.tbc_url(x->'url')) or (x ? 'assetId' and not x ? 'url' and x->>'assetId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')) then return false; end if;
  end loop;
 end if;
 if d ? 'exceptions' then
  if jsonb_typeof(d->'exceptions')<>'array' or jsonb_array_length(d->'exceptions')>64 then return false; end if;
  vals='{}';
  for x in select value from jsonb_array_elements(d->'exceptions') loop
   if jsonb_typeof(x)<>'object' or x-ARRAY['date','closed','periods','note']<>'{}'::jsonb or not x ?& ARRAY['date','closed','periods'] or x->>'date' !~ '^(20[0-9]{2}|2100)-[0-9]{2}-[0-9]{2}$' or to_char((x->>'date')::date,'YYYY-MM-DD')<>x->>'date' or x->>'date'=any(vals) or jsonb_typeof(x->'closed')<>'boolean' or jsonb_typeof(x->'periods')<>'array' or jsonb_array_length(x->'periods')>4 or ((x->>'closed')::boolean and jsonb_array_length(x->'periods')<>0) or (not (x->>'closed')::boolean and jsonb_array_length(x->'periods')=0) or (x ? 'note' and not public.tbc_text(x->'note',0,160)) then return false; end if;
   vals=array_append(vals,x->>'date');
   for y in select value from jsonb_array_elements(x->'periods') loop
    if jsonb_typeof(y)<>'object' or y-ARRAY['opens','closes']<>'{}'::jsonb or coalesce(y->>'opens','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or coalesce(y->>'closes','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or y->>'opens'=y->>'closes' then return false; end if;
   end loop;
  end loop;
 end if;
 if d ? 'review' then
  x=d->'review';
  if jsonb_typeof(x)<>'object' or x-ARRAY['date','fields']<>'{}'::jsonb or not x ?& ARRAY['date','fields'] or x->>'date' !~ '^(20[0-9]{2}|2100)-[0-9]{2}-[0-9]{2}$' or to_char((x->>'date')::date,'YYYY-MM-DD')<>x->>'date' or (x->>'date')::date>(now() at time zone 'America/Argentina/Buenos_Aires')::date or jsonb_typeof(x->'fields')<>'array' or jsonb_array_length(x->'fields') not between 1 and 4 or (select count(distinct value) from jsonb_array_elements(x->'fields'))<>jsonb_array_length(x->'fields') then return false; end if;
  for y in select value from jsonb_array_elements(x->'fields') loop if jsonb_typeof(y)<>'string' or y#>>'{}' not in ('contact','location','hours','photos') then return false; end if; end loop;
 end if;
 return true;
exception when others then return false;
end $$;

create or replace function public.tbc_public_catalog() returns jsonb
language sql stable security definer set search_path=pg_catalog,public as $$
 select jsonb_build_object('revision',c.revision,'data',c.data || jsonb_build_object('businesses',coalesce((select jsonb_agg(b.published order by b.id) from public.tbc_businesses b where not archived and published is not null),'[]'::jsonb))) from public.tbc_catalog c where id=1;
$$;
create or replace function public.tbc_admin_catalog() returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public,auth as $$
begin
 perform public.tbc_access();
 return (select jsonb_build_object('revision',c.revision,'data',c.data,'records',coalesce((select jsonb_agg(to_jsonb(b) order by b.updated_at desc) from public.tbc_businesses b where public.tbc_can_manage(b.neighborhood) and (b.published is null or public.tbc_can_manage(b.published->>'neighborhood'))),'[]'::jsonb),'requests',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from (select * from public.tbc_requests where public.tbc_can_manage(neighborhood) and status in ('pending','needs_changes') order by created_at asc limit 100) r),'[]'::jsonb)) from public.tbc_catalog c where id=1);
end $$;
create or replace function public.tbc_save_draft(p_business jsonb,p_expected bigint,p_actor uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,auth as $$
declare c public.tbc_catalog; old public.tbc_businesses; next_revision bigint; b jsonb;
begin
 select * into c from public.tbc_catalog where id=1 for update;
 if not public.tbc_valid_business(p_business,c.data) then raise exception 'INVALID_DATA' using errcode='22023'; end if;
 if not public.tbc_can_manage(p_business->>'neighborhood',p_actor) then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
 select * into old from public.tbc_businesses where id=p_business->>'id' for update;
 if found then
  if not public.tbc_can_manage(old.neighborhood,p_actor) or (old.published is not null and not public.tbc_can_manage(old.published->>'neighborhood',p_actor)) then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  if old.revision<>p_expected then raise exception 'CONFLICT' using errcode='40001'; end if;
  next_revision=old.revision+1;
 else
  if p_expected<>0 then raise exception 'CONFLICT' using errcode='40001'; end if;
  if (select count(*) from public.tbc_businesses where true)>=2000 then raise exception 'LIMIT_REACHED' using errcode='22023'; end if;
  next_revision=1;
 end if;
 if exists(select 1 from jsonb_array_elements(coalesce(p_business#>'{details,photos}','[]')) photo where photo ? 'assetId' and not exists(select 1 from public.tbc_media m where m.id::text=photo->>'assetId' and m.neighborhood=p_business->>'neighborhood')) then raise exception 'INVALID_MEDIA' using errcode='22023'; end if;
 if coalesce((select sum(octet_length(coalesce(draft,published)::text)) from public.tbc_businesses where not archived and id<>p_business->>'id'),0)+octet_length(p_business::text)>2000000 then raise exception 'LIMIT_REACHED' using errcode='22023'; end if;
 b=p_business #- '{details,publishedAt}';
 insert into public.tbc_businesses(id,neighborhood,draft,revision) values(b->>'id',b->>'neighborhood',b,next_revision)
 on conflict(id) do update set draft=excluded.draft,neighborhood=excluded.neighborhood,revision=excluded.revision,archived=false,updated_at=now();
 insert into public.tbc_history(business_id,revision,action,payload,actor) values(b->>'id',next_revision,'draft',b,p_actor);
 return jsonb_build_object('revision',next_revision,'id',b->>'id');
end $$;
create or replace function public.tbc_publish(p_id text,p_expected bigint,p_actor uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,auth as $$
declare b public.tbc_businesses; c public.tbc_catalog; payload jsonb;
begin
 select * into c from public.tbc_catalog where id=1 for update;
 select * into b from public.tbc_businesses where id=p_id for update;
 if not found or not public.tbc_can_manage(b.neighborhood,p_actor) or (b.published is not null and not public.tbc_can_manage(b.published->>'neighborhood',p_actor)) then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
 if b.revision<>p_expected then raise exception 'CONFLICT' using errcode='40001'; end if;
 if b.draft is null or not public.tbc_valid_business(b.draft,c.data) then raise exception 'INVALID_DATA' using errcode='22023'; end if;
 payload=jsonb_set(b.draft,'{details}',coalesce(b.draft->'details','{}'::jsonb)||jsonb_build_object('publishedAt',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));
 update public.tbc_businesses set published=payload,draft=null,archived=false,revision=revision+1,updated_at=now() where id=p_id;
 if coalesce((select sum(octet_length(published::text)) from public.tbc_businesses where not archived),0)>2000000 then raise exception 'LIMIT_REACHED' using errcode='22023'; end if;
 update public.tbc_catalog set revision=revision+1,updated_at=now() where id=1;
 insert into public.tbc_history(business_id,revision,action,payload,actor) values(p_id,p_expected+1,'publish',payload,p_actor);
 return jsonb_build_object('revision',p_expected+1);
end $$;
create or replace function public.tbc_history_for(p_id text) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public,auth as $$
begin
 perform public.tbc_access();
 if not exists(select 1 from public.tbc_businesses where id=p_id and public.tbc_can_manage(neighborhood) and (published is null or public.tbc_can_manage(published->>'neighborhood'))) then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(to_jsonb(h) order by revision desc),'[]'::jsonb) from (select * from public.tbc_history where business_id=p_id order by revision desc limit 50) h);
end $$;
create or replace function public.tbc_restore(p_id text,p_history_id uuid,p_expected bigint,p_actor uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,auth as $$
declare h public.tbc_history; result jsonb;
begin
 perform 1 from public.tbc_catalog where id=1 for update;
 if not exists(select 1 from public.tbc_businesses where id=p_id and public.tbc_can_manage(neighborhood,p_actor)) then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
 select * into h from public.tbc_history where id=p_history_id and business_id=p_id;
 if not found then raise exception 'NOT_FOUND' using errcode='22023'; end if;
 result=public.tbc_save_draft(h.payload,p_expected,p_actor);
 update public.tbc_history set action='restore' where business_id=p_id and revision=(result->>'revision')::bigint;
 return result;
end $$;
create or replace function public.tbc_archive(p_id text,p_expected bigint,p_actor uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,auth as $$
declare b public.tbc_businesses;
begin
 perform 1 from public.tbc_catalog where id=1 for update;
 select * into b from public.tbc_businesses where id=p_id for update;
 if not found or not public.tbc_can_manage(b.neighborhood,p_actor) or (b.published is not null and not public.tbc_can_manage(b.published->>'neighborhood',p_actor)) then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
 if b.revision<>p_expected then raise exception 'CONFLICT' using errcode='40001'; end if;
 insert into public.tbc_history(business_id,revision,action,payload,actor) values(p_id,p_expected+1,'archive',coalesce(b.draft,b.published),p_actor);
 update public.tbc_businesses set published=null,draft=null,archived=true,revision=revision+1,updated_at=now() where id=p_id;
 update public.tbc_catalog set revision=revision+1,updated_at=now() where id=1;
 return jsonb_build_object('revision',p_expected+1);
end $$;
create or replace function public.tbc_save_meta(p_data jsonb,p_expected bigint,p_actor uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,auth as $$
declare c public.tbc_catalog; x jsonb;
begin
 if not public.tbc_is_owner(p_actor) then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
 select * into c from public.tbc_catalog where id=1 for update;
 if c.revision<>p_expected then raise exception 'CONFLICT' using errcode='40001'; end if;
 if jsonb_typeof(p_data)<>'object' or p_data-ARRAY['version','settings','categories','neighborhoods','neighborhoodEdition','businesses']<>'{}'::jsonb or not p_data ?& ARRAY['version','settings','categories','neighborhoods','neighborhoodEdition','businesses'] or jsonb_typeof(p_data->'version')<>'number' or p_data->>'version'<>'1' or p_data->>'neighborhoodEdition'<>'2' or jsonb_typeof(p_data->'settings')<>'object' or (p_data->'settings')-ARRAY['appName','neighborhood','intro','ownerWhatsapp']<>'{}'::jsonb or not (p_data->'settings') ?& ARRAY['appName','neighborhood','intro','ownerWhatsapp'] or not public.tbc_text(p_data#>'{settings,appName}',1,35) or not public.tbc_text(p_data#>'{settings,neighborhood}',1,60) or jsonb_typeof(p_data#>'{settings,intro}')<>'string' or length(p_data#>>'{settings,intro}') not between 1 and 260 or not public.tbc_text(p_data#>'{settings,ownerWhatsapp}',0,25) or jsonb_typeof(p_data->'businesses')<>'array' or jsonb_array_length(p_data->'businesses')<>0 or jsonb_typeof(p_data->'categories')<>'array' or jsonb_array_length(p_data->'categories')>200 or jsonb_typeof(p_data->'neighborhoods')<>'array' or jsonb_array_length(p_data->'neighborhoods') not between 1 and 200 or not (p_data->'neighborhoods') ? (p_data#>>'{settings,neighborhood}') then raise exception 'INVALID_DATA' using errcode='22023'; end if;
 if p_data#>>'{settings,ownerWhatsapp}'<>'' and (p_data#>>'{settings,ownerWhatsapp}' !~ '^\+?[0-9 ()-]+$' or regexp_replace(p_data#>>'{settings,ownerWhatsapp}','[^0-9]','','g') !~ '^[1-9][0-9]{7,14}$') then raise exception 'INVALID_DATA' using errcode='22023'; end if;
 for x in select value from jsonb_array_elements(p_data->'categories') loop if not public.tbc_text(x,1,50) or lower(trim(x#>>'{}'))='todos' then raise exception 'INVALID_DATA' using errcode='22023'; end if; end loop;
 for x in select value from jsonb_array_elements(p_data->'neighborhoods') loop if not public.tbc_text(x,1,60) then raise exception 'INVALID_DATA' using errcode='22023'; end if; end loop;
 if (select count(distinct lower(trim(value#>>'{}'))) from jsonb_array_elements(p_data->'categories'))<>jsonb_array_length(p_data->'categories') or (select count(distinct lower(trim(value#>>'{}'))) from jsonb_array_elements(p_data->'neighborhoods'))<>jsonb_array_length(p_data->'neighborhoods') then raise exception 'INVALID_DATA' using errcode='22023'; end if;
 if exists(select 1 from public.tbc_requests where status in ('pending','needs_changes') and not (p_data->'neighborhoods') ? neighborhood) then raise exception 'REFERENCES_EXIST' using errcode='22023'; end if;
 if exists(select 1 from public.tbc_businesses b where not archived and ((published is not null and not public.tbc_valid_business(published,p_data)) or (draft is not null and not public.tbc_valid_business(draft,p_data)))) then raise exception 'REFERENCES_EXIST' using errcode='22023'; end if;
 update public.tbc_catalog set data=p_data,revision=revision+1,updated_at=now() where id=1;
 return jsonb_build_object('revision',p_expected+1);
end $$;

-- Only the server's service key may meter anonymous actions or create pending requests.
create or replace function public.tbc_consume_quota(p_key text,p_limit integer,p_seconds integer) returns boolean
language plpgsql security definer set search_path=pg_catalog,public as $$
declare next_count integer;
begin
 if length(p_key) not between 10 and 100 or p_limit not between 1 and 100 or p_seconds not between 60 and 86400 then raise exception 'INVALID_DATA'; end if;
 delete from public.tbc_quotas where resets_at<now()-interval '2 days';
 insert into public.tbc_quotas(key,count,resets_at) values(p_key,1,now()+make_interval(secs=>p_seconds))
 on conflict(key) do update set count=case when tbc_quotas.resets_at<=now() then 1 else tbc_quotas.count+1 end,
 resets_at=case when tbc_quotas.resets_at<=now() then now()+make_interval(secs=>p_seconds) else tbc_quotas.resets_at end
 where tbc_quotas.resets_at<=now() or tbc_quotas.count<p_limit returning count into next_count;
 return next_count is not null;
end $$;
create or replace function public.tbc_submit_request(p_payload jsonb,p_nonce uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare c public.tbc_catalog; request_id uuid;
begin
 select * into c from public.tbc_catalog where id=1 for update;
 if jsonb_typeof(p_payload)<>'object' or p_payload-ARRAY['kind','businessId','neighborhood','name','category','address','description','whatsapp','field','note','contactName','contact']<>'{}'::jsonb or p_payload->>'kind' not in ('new','correction') or not public.tbc_text(p_payload->'neighborhood',1,60) or not (c.data->'neighborhoods') ? (p_payload->>'neighborhood') or (jsonb_typeof(p_payload->'note')<>'string' or not public.tbc_text(to_jsonb(translate(p_payload->>'note',E'\n\r\t','   ')),10,1000)) then raise exception 'INVALID_DATA' using errcode='22023'; end if;
 if p_payload->>'kind'='correction' and not exists(select 1 from public.tbc_businesses where id=p_payload->>'businessId' and published->>'neighborhood'=p_payload->>'neighborhood' and published is not null and not archived) then raise exception 'INVALID_DATA' using errcode='22023'; end if;
 if p_payload->>'kind'='new' and (not public.tbc_text(p_payload->'name',1,70) or not public.tbc_text(p_payload->'category',1,50) or not (c.data->'categories') ? (p_payload->>'category') or not public.tbc_text(p_payload->'address',1,120)) then raise exception 'INVALID_DATA' using errcode='22023'; end if;
 if (select count(*) from public.tbc_requests where status in ('pending','needs_changes'))>=500 then raise exception 'LIMIT_REACHED' using errcode='22023'; end if;
 delete from public.tbc_nonces where expires_at<now();
 insert into public.tbc_nonces(id,expires_at) values(p_nonce,now()+interval '15 minutes');
 insert into public.tbc_requests(kind,business_id,neighborhood,payload) values(p_payload->>'kind',p_payload->>'businessId',p_payload->>'neighborhood',p_payload) returning id into request_id;
 return jsonb_build_object('id',request_id,'status','pending');
end $$;
create or replace function public.tbc_review_request(p_id uuid,p_expected bigint,p_status text,p_note text,p_actor uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,auth as $$
declare r public.tbc_requests;
begin
 perform 1 from public.tbc_catalog where id=1 for update;
 select * into r from public.tbc_requests where id=p_id for update;
 if not found or not public.tbc_can_manage(r.neighborhood,p_actor) then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
 if r.revision<>p_expected then raise exception 'CONFLICT' using errcode='40001'; end if;
 if r.status not in ('pending','needs_changes') or p_status not in ('needs_changes','rejected') or length(trim(p_note)) not between 5 and 1000 then raise exception 'INVALID_DATA' using errcode='22023'; end if;
 update public.tbc_requests set status=p_status,review_note=p_note,reviewed_by=p_actor,reviewed_at=now(),revision=revision+1 where id=p_id;
 return jsonb_build_object('revision',p_expected+1);
end $$;
create or replace function public.tbc_request_to_draft(p_id uuid,p_expected bigint,p_business jsonb,p_business_expected bigint,p_actor uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,auth as $$
declare r public.tbc_requests; result jsonb;
begin
 perform 1 from public.tbc_catalog where id=1 for update;
 select * into r from public.tbc_requests where id=p_id for update;
 if not found or not public.tbc_can_manage(r.neighborhood,p_actor) then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
 if r.revision<>p_expected then raise exception 'CONFLICT' using errcode='40001'; end if;
 if r.status not in ('pending','needs_changes') or r.neighborhood<>p_business->>'neighborhood' or (r.kind='correction' and r.business_id<>p_business->>'id') then raise exception 'INVALID_DATA' using errcode='22023'; end if;
 result=public.tbc_save_draft(p_business,p_business_expected,p_actor);
 update public.tbc_requests set status='approved',business_id=p_business->>'id',reviewed_by=p_actor,reviewed_at=now(),revision=revision+1 where id=p_id;
 return result;
end $$;
create or replace function public.tbc_register_media(p_id uuid,p_neighborhood text,p_actor uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,auth as $$
begin
 if not public.tbc_can_manage(p_neighborhood,p_actor) or not exists(select 1 from public.tbc_catalog where (data->'neighborhoods') ? p_neighborhood) then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
 insert into public.tbc_media(id,neighborhood,actor) values(p_id,p_neighborhood,p_actor);
 return jsonb_build_object('id',p_id);
end $$;
create or replace function public.tbc_media_access(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public,auth as $$
declare m public.tbc_media; is_public boolean;
begin
 select * into m from public.tbc_media where id=p_id;
 if not found then return jsonb_build_object('allowed',false); end if;
 select exists(select 1 from public.tbc_businesses b, jsonb_array_elements(coalesce(b.published#>'{details,photos}','[]')) p where not b.archived and b.published is not null and p->>'assetId'=p_id::text) into is_public;
 if not is_public and auth.uid() is not null then perform public.tbc_access(); end if;
 if is_public or public.tbc_can_manage(m.neighborhood) then return jsonb_build_object('allowed',true,'public',is_public,'path',p_id::text||'.webp'); end if;
 return jsonb_build_object('allowed',false);
end $$;

-- Explicit grants; no caller receives direct table access or can grant itself membership.
revoke all on function public.tbc_can_manage(text,uuid),public.tbc_is_owner(uuid),public.tbc_text(jsonb,integer,integer),public.tbc_url(jsonb),public.tbc_valid_business(jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.tbc_access(),public.tbc_public_catalog(),public.tbc_admin_catalog(),public.tbc_save_draft(jsonb,bigint,uuid),public.tbc_publish(text,bigint,uuid),public.tbc_history_for(text),public.tbc_restore(text,uuid,bigint,uuid),public.tbc_archive(text,bigint,uuid),public.tbc_save_meta(jsonb,bigint,uuid),public.tbc_consume_quota(text,integer,integer),public.tbc_submit_request(jsonb,uuid),public.tbc_review_request(uuid,bigint,text,text,uuid),public.tbc_request_to_draft(uuid,bigint,jsonb,bigint,uuid),public.tbc_register_media(uuid,text,uuid),public.tbc_media_access(uuid) from public,anon,authenticated;
grant execute on function public.tbc_public_catalog(),public.tbc_media_access(uuid) to anon,authenticated;
grant execute on function public.tbc_access(),public.tbc_admin_catalog(),public.tbc_history_for(text) to authenticated;
grant execute on function public.tbc_consume_quota(text,integer,integer),public.tbc_submit_request(jsonb,uuid),public.tbc_save_draft(jsonb,bigint,uuid),public.tbc_publish(text,bigint,uuid),public.tbc_restore(text,uuid,bigint,uuid),public.tbc_archive(text,bigint,uuid),public.tbc_save_meta(jsonb,bigint,uuid),public.tbc_review_request(uuid,bigint,text,text,uuid),public.tbc_request_to_draft(uuid,bigint,jsonb,bigint,uuid),public.tbc_register_media(uuid,text,uuid) to service_role;
commit;
