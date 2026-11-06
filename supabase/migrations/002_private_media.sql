begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('tbc-private-media','tbc-private-media',false,5242880,ARRAY['image/webp'])
on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=ARRAY['image/webp'];
-- Even an unrelated permissive policy must not expose this bucket.
drop policy if exists tbc_media_no_client_access on storage.objects;
create policy tbc_media_no_client_access on storage.objects as restrictive for all to anon,authenticated
using(bucket_id<>'tbc-private-media') with check(bucket_id<>'tbc-private-media');
commit;
