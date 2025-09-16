USE QuimLab;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.rol WHERE idRol = 'ADMIN')
INSERT INTO dbo.rol (idRol, nombre) VALUES
('ADMIN', 'Administrador');

IF NOT EXISTS (SELECT 1 FROM dbo.rol WHERE idRol = 'INSTR')
INSERT INTO dbo.rol (idRol, nombre) VALUES
('INSTR', 'Instructor');

IF NOT EXISTS (SELECT 1 FROM dbo.rol WHERE idRol = 'LOGIS')
INSERT INTO dbo.rol (idRol, nombre) VALUES
('LOGIS', 'Logística');

IF NOT EXISTS (SELECT 1 FROM dbo.rol WHERE idRol = 'DELEG')
INSERT INTO dbo.rol (idRol, nombre) VALUES
('DELEG', 'Delegado');

