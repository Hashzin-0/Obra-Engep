-- Bound user-controlled text and JSON payloads at the database boundary.
alter table public.feedback
  add constraint feedback_message_length_check
    check (message is not null and char_length(message) between 1 and 5000),
  add constraint feedback_email_length_check
    check (contact_email is null or char_length(contact_email) <= 254),
  add constraint feedback_page_length_check
    check (page is null or char_length(page) <= 255),
  add constraint feedback_status_check
    check (status in ('aberto', 'em_analise', 'resolvido'));

alter table public.notes
  add constraint notes_title_length_check
    check (title is not null and char_length(title) <= 200),
  add constraint notes_content_length_check
    check (content is not null and char_length(content) <= 100000),
  add constraint notes_category_length_check
    check (category is null or char_length(category) <= 80),
  add constraint notes_tags_count_check
    check (coalesce(cardinality(tags), 0) <= 30);

alter table public.projects
  add constraint projects_name_length_check
    check (name is not null and char_length(name) <= 120),
  add constraint projects_type_length_check
    check (type is null or char_length(type) <= 80),
  add constraint projects_stage_length_check
    check (stage is null or char_length(stage) <= 80),
  add constraint projects_scale_length_check
    check (scale is null or char_length(scale) <= 80),
  add constraint projects_data_size_check
    check (data is null or pg_column_size(data) <= 10485760);

alter table public.checklists
  add constraint checklists_norm_id_length_check
    check (norm_id is not null and char_length(norm_id) <= 120),
  add constraint checklists_items_size_check
    check (items is null or pg_column_size(items) <= 1048576);

alter table public.profiles
  add constraint profiles_display_name_length_check
    check (display_name is null or char_length(display_name) <= 120),
  add constraint profiles_profession_length_check
    check (profession is null or char_length(profession) <= 120),
  add constraint profiles_company_length_check
    check (company is null or char_length(company) <= 160);

alter table public.automotive_catalog
  add constraint automotive_catalog_name_length_check
    check (name is not null and char_length(name) between 1 and 180),
  add constraint automotive_catalog_category_length_check
    check (category is null or char_length(category) <= 80),
  add constraint automotive_catalog_manufacturer_length_check
    check (manufacturer is null or char_length(manufacturer) <= 120),
  add constraint automotive_catalog_ph_type_check
    check (ph_type in ('Neutro', 'Ácido', 'Alcalino', 'Não informado')),
  add constraint automotive_catalog_surfaces_count_check
    check (coalesce(cardinality(target_surfaces), 0) <= 30),
  add constraint automotive_catalog_cautions_count_check
    check (coalesce(cardinality(cautions), 0) <= 30),
  add constraint automotive_catalog_dilution_range_check
    check (dilution_number between 0.0001 and 1000000),
  add constraint automotive_catalog_dilution_text_length_check
    check (dilution_ratio is null or char_length(dilution_ratio) <= 120),
  add constraint automotive_catalog_action_time_length_check
    check (action_time_minutes is null or char_length(action_time_minutes) <= 120),
  add constraint automotive_catalog_yield_length_check
    check (yield_info is null or char_length(yield_info) <= 500),
  add constraint automotive_catalog_instructions_length_check
    check (instructions is null or char_length(instructions) <= 10000),
  add constraint automotive_catalog_source_label_length_check
    check (source_label is null or char_length(source_label) <= 240),
  add constraint automotive_catalog_source_url_check
    check (source_url is null or (char_length(source_url) <= 2048 and source_url ~* '^https://')),
  add constraint automotive_catalog_image_url_check
    check (image_url is null or (char_length(image_url) <= 2048 and image_url ~* '^https://')),
  add constraint automotive_catalog_sort_order_check
    check (sort_order between -10000 and 10000);
