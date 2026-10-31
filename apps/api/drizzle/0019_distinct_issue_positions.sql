-- Issues used to be created at position 1000, so many tie and cannot be reordered between each other.
-- Spread each project's issues 1000 apart, keeping their current order (position, then number).
UPDATE "issues" AS "target"
SET "position" = "ranked"."rank" * 1000
FROM (
	SELECT "id", row_number() OVER (PARTITION BY "project_id" ORDER BY "position", "number") AS "rank"
	FROM "issues"
) AS "ranked"
WHERE "target"."id" = "ranked"."id";
