# Guia Manual AWS (Consola Web) para MK Booking

Esta guia reemplaza CDK y documenta como dejar la infraestructura manualmente en AWS para:

- Entorno `dev`
- Entorno `prod`
- Credencial IAM compartida (una sola access key) para ambos buckets
- S3 privado + CloudFront para servir media

## 1. Objetivo de arquitectura

Por entorno debes tener:

- 1 bucket S3 privado
- 1 distribucion CloudFront con origen ese bucket
- Acceso al bucket solo desde CloudFront (lectura publica via CDN, no via URL directa S3)

Ademas:

- 1 usuario IAM compartido para backend con permisos de `List/Get/Put/Delete` sobre ambos buckets (`dev` y `prod`).

## 2. Nombres recomendados

Usa un sufijo unico global:

- Bucket dev: `mkbooking-dev-<suffix>`
- Bucket prod: `mkbooking-prod-<suffix>`

Ejemplo: `mkbooking-dev-pa01`, `mkbooking-prod-pa01`.

## 3. Crear bucket S3 (dev)

1. AWS Console -> `S3` -> `Create bucket`.
2. Bucket name: `mkbooking-dev-<suffix>`.
3. Region: la misma que usaras en app (recomendado `us-east-1`).
4. Object Ownership: `ACLs disabled (recommended)`.
5. Block Public Access: dejar `Block all public access` habilitado.
6. Bucket Versioning: opcional (recomendado `Enabled` en prod, opcional en dev).
7. Crear bucket.

Despues de crear:

1. Bucket -> `Properties` -> confirmar `Bucket owner enforced`.
2. Bucket -> `Permissions` -> confirmar que no exista policy publica.

## 4. Crear bucket S3 (prod)

Repite el paso anterior con:

- `mkbooking-prod-<suffix>`

## 5. Crear CloudFront para dev

1. AWS Console -> `CloudFront` -> `Create distribution`.
2. Origin domain: selecciona bucket `mkbooking-dev-<suffix>` (origen S3, no website endpoint).
3. Origin access:
   - `Origin access control settings (recommended)`.
   - Crear OAC nuevo si lo pide.
   - Aceptar update de bucket policy automatico si CloudFront lo ofrece.
4. Viewer protocol policy: `Redirect HTTP to HTTPS`.
5. Allowed HTTP methods: `GET, HEAD`.
6. Cache policy: `Managed-CachingOptimized`.
7. Origin request policy: `Managed-CORS-S3Origin`.
8. Compress objects automatically: `Yes`.
9. Price class: `Use only North America and Europe` (`PriceClass_100`) si quieres costo menor.
10. Crear distribucion.

Guardar:

- `Distribution ID`
- `Domain name` (ejemplo `dxxxxx.cloudfront.net`)

## 6. Crear CloudFront para prod

Repite el mismo proceso para bucket `mkbooking-prod-<suffix>`.

Guardar:

- `Distribution ID`
- `Domain name` de prod

## 7. Validar policy S3 restringida a CloudFront

En cada bucket (`dev` y `prod`):

1. `Permissions` -> `Bucket policy`.
2. Verifica que exista policy permitiendo `s3:GetObject` a `cloudfront.amazonaws.com` con condicion `AWS:SourceArn` de la distribucion correcta.
3. No debe haber permisos publicos anonimos.

Si no se agrego automaticamente, agrega manualmente una policy como esta (ajustando valores):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipalReadOnly",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::mkbooking-prod-<suffix>/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::<ACCOUNT_ID>:distribution/<DISTRIBUTION_ID>"
        }
      }
    }
  ]
}
```

## 8. Crear IAM user compartido para backend

1. AWS Console -> `IAM` -> `Users` -> `Create user`.
2. User name: `mkbooking-backend-user`.
3. Sin acceso a consola.
4. Crear policy inline (o customer managed) con este contenido (ajustar ARNs):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListBuckets",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": [
        "arn:aws:s3:::mkbooking-dev-<suffix>",
        "arn:aws:s3:::mkbooking-prod-<suffix>"
      ]
    },
    {
      "Sid": "ObjectsCrud",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::mkbooking-dev-<suffix>/*",
        "arn:aws:s3:::mkbooking-prod-<suffix>/*"
      ]
    }
  ]
}
```

5. Crear `Access key` para ese user.
6. Guardar:
   - `Access key ID`
   - `Secret access key` (solo se muestra una vez)

## 9. Variables de entorno de la app

## 9.1 Produccion (Render / `.env`)

- `AWS_REGION=<region>`
- `AWS_S3_BUCKET=mkbooking-prod-<suffix>`
- `AWS_ACCESS_KEY_ID=<access-key-id>`
- `AWS_SECRET_ACCESS_KEY=<secret-access-key>`
- `AWS_S3_PUBLIC_BASE_URL=https://<cloudfront-prod-domain>`
- `AWS_S3_LEGACY_PUBLIC_BASE_URLS=https://<dominio-viejo-s3-opcional>`

## 9.2 Desarrollo (si tienes deployment dev separado)

- `AWS_REGION=<region>`
- `AWS_S3_BUCKET=mkbooking-dev-<suffix>`
- `AWS_ACCESS_KEY_ID=<mismo access-key-id>`
- `AWS_SECRET_ACCESS_KEY=<mismo secret-access-key>`
- `AWS_S3_PUBLIC_BASE_URL=https://<cloudfront-dev-domain>`
- `AWS_S3_LEGACY_PUBLIC_BASE_URLS=https://<dominio-viejo-s3-opcional>`

## 10. Migrar URLs existentes a CloudFront

El proyecto ya tiene script para reemplazar base URL:

```bash
pnpm storage:migrate:s3-to-cloudfront -- --dry-run
pnpm storage:migrate:s3-to-cloudfront -- --execute
```

Recomendado:

1. Configurar primero `AWS_S3_PUBLIC_BASE_URL` con dominio CloudFront nuevo.
2. Configurar `AWS_S3_LEGACY_PUBLIC_BASE_URLS` con dominio S3 anterior.
3. Ejecutar `dry-run`.
4. Ejecutar `execute`.

## 11. Checklist de validacion final

- Upload de imagen desde admin funciona.
- Imagen nueva abre por URL CloudFront.
- URL directa S3 no publica no es accesible anonimamente.
- Busqueda publica `/s/[query]` carga imagenes correctamente.
- PDFs/documentos (si aplican) abren desde CloudFront.

## 12. Operacion y seguridad recomendada

- Rota access keys periodicamente (por ejemplo cada 90 dias).
- Guarda keys en un secret manager de tu plataforma (Render environment secret).
- No reutilices el mismo key fuera de MK Booking.
- En fase futura, migrar a roles temporales en lugar de access keys largas.
