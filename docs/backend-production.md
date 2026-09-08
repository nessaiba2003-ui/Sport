# Backend Aljawarih — configuration et exploitation

## Fonctions disponibles

- Authentification avec PBKDF2, sessions signées, vérification e-mail et réinitialisation du mot de passe.
- Rôles `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `COACH`, `CONTENT_MANAGER` et `CLIENT`.
- Elhabib possède `SUPER_ADMIN` et `COACH`.
- Membres, profils avec CIN, coachs et photos associables.
- Abonnements avec calcul automatique de la date de fin et des statuts.
- Paiements en MAD dont le montant provient du tarif sélectionné.
- Réservations contrôlant séance, doublon, disponibilité et abonnement actif.
- Présences par QR temporaire ou saisie manuelle dans la même collection.
- Événements, inscriptions, annulations, matériel à apporter et archivage logique.
- Notifications automatiques pour séances, événements et expiration d'abonnement.
- Finances internes : revenus, dépenses et dons/sadaqat.
- Historique des actions administratives.
- Rapports annuels JSON, Excel, PDF et Word.
- Upload protégé des images et justificatifs (5 Mo maximum).

## Routes principales ajoutées

- `GET/POST/PUT/DELETE /api/coaches`
- `POST /api/coaches/:id/restore`
- `GET/POST /api/memberships`
- `POST /api/memberships/:id/renew`
- `POST /api/payments`
- `GET /api/classes/:id/participants`
- `GET /api/classes/:id/qr`
- `POST /api/attendance/scan`
- `POST /api/support-requests`
- `GET/POST/PUT/DELETE /api/admin/finance`
- `GET /api/admin/audit-logs`
- `POST /api/admin/media`
- `GET /api/admin/report?year=2026&format=xlsx|pdf|docx|json`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET|POST /api/auth/verify-email`

## Variables obligatoires

Copier `.env.example` vers `.env`, générer un secret long pour `APP_SESSION_SECRET`, puis renseigner les paramètres SMTP. Pour Gmail, utiliser un mot de passe d'application, jamais le mot de passe principal du compte.

## Persistance

Le mode local utilise `data/db.json` avec écriture atomique : les données survivent au redémarrage du serveur. Un hébergement serverless comme Vercel ne garantit pas la persistance des fichiers locaux. Avant la mise en production sur Vercel, connecter `DATABASE_URL` à PostgreSQL et brancher les routes sur Prisma à partir de `prisma/schema.prisma`. Les images doivent alors être placées dans un stockage objet persistant (S3, Cloudinary, Supabase Storage ou équivalent).

## Sauvegardes recommandées

- En local, exécuter `npm run backup` pour créer une copie horodatée ; les 30 dernières sont conservées.
- Sauvegarde PostgreSQL quotidienne chiffrée.
- Conservation de sauvegardes quotidiennes, mensuelles et annuelles.
- Test de restauration périodique.
- Stockage objet avec versionnement pour les photos, documents et justificatifs.
