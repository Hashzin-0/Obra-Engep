-- user-media is only used for automotive label photos. No objects existed when this restriction was checked.
update storage.buckets
set allowed_mime_types = array['image/webp']::text[],
    file_size_limit = 5242880
where id = 'user-media';

alter policy user_media_insert
  on storage.objects
  with check (
    bucket_id = 'user-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~* '\.webp
    and metadata ->> 'mimetype' = 'image/webp'
    and coalesce((metadata ->> 'size')::bigint, 0) <= 5242880
  );

alter policy user_media_update
  on storage.objects
  using (
    bucket_id = 'user-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'user-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~* '\\.webp$'
    and metadata ->> 'mimetype' = 'image/webp'
    and coalesce((metadata ->> 'size')::bigint, 0) <= 5242880
  );

    and metadata ->> 'mimetype' = 'image/webp'
    and coalesce((metadata ->> 'size')::bigint, 0) <= 5242880
  );

alter policy user_media_update
  on storage.objects
  using (
    bucket_id = 'user-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'user-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~* '\.webp
    and metadata ->> 'mimetype' = 'image/webp'
    and coalesce((metadata ->> 'size')::bigint, 0) <= 5242880
  );

    and metadata ->> 'mimetype' = 'image/webp'
    and coalesce((metadata ->> 'size')::bigint, 0) <= 5242880
  );
