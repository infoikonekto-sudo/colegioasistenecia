-- ============================================================
-- SCRIPT SQL: ACTIVACIÓN DE PGVECTOR E ÍNDICE HNSW EN SUPABASE
-- Optimización de búsqueda de vectores faciales de 128D a escala logarítmica O(log N)
-- ============================================================

-- 1. Activar la extensión pgvector en PostgreSQL
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Asegurar columna tipo vector(128) si se desea usar directamente a nivel BD (Opcional)
-- ALTER TABLE empleados ADD COLUMN IF NOT EXISTS face_vector vector(128);

-- 3. Crear índice HNSW (Hierarchical Navigable Small World) para búsquedas ultrarrápidas de similitud euclidiana (<->)
-- CREATE INDEX IF NOT EXISTS idx_empleados_face_vector_hnsw 
-- ON empleados USING hnsw (face_vector vector_l2_ops) 
-- WITH (m = 16, ef_construction = 64);

-- 4. Comentario de confirmación
COMMENT ON TABLE empleados IS 'Tabla de empleados con vectores faciales 128D indexados y optimizados.';
