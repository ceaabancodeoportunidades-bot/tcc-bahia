
CREATE POLICY "Anyone can read tcc pdfs" ON storage.objects FOR SELECT
  USING (bucket_id = 'tcc-pdfs');

CREATE POLICY "Authenticated upload tcc pdfs" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'tcc-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner update tcc pdfs" ON storage.objects FOR UPDATE
  USING (bucket_id = 'tcc-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner or admin delete tcc pdfs" ON storage.objects FOR DELETE
  USING (bucket_id = 'tcc-pdfs' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));
