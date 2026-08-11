-- Filtre "pour qui" (Conseiller Cadeau, filtre catalogue) combiné à status,
-- utilisé fréquemment sans index dédié jusqu'ici.
CREATE INDEX "Product_status_targetGender_idx" ON "Product"("status", "targetGender");
