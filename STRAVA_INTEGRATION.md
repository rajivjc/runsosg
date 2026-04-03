# Strava Integration

Kita integrates with Strava to automatically match coach run activities to athlete
session records within a club. This document explains how the integration works,
what data is used and why, and the constraints we operate under.

## How it works

Coaches connect their personal Strava account to Kita via OAuth (`activity:read` scope).
When a coach records a club run on Strava, a webhook notifies Kita. Kita fetches the
activity and matches it to athletes in the coach's club using hashtag patterns in the
activity title or description (e.g. `#Daniel`, `#SOSG Daniel`). The matched session is
then visible to that athlete and their caregiver within the same club.

Matching is deterministic — regex and string matching only, no ML.

## OAuth scope

Kita requests `activity:read` scope only. This covers activities recorded as Everyone
or Followers visibility. Activities set to Only Me on Strava will not sync to Kita.
Coaches are informed of this requirement on the consent screen before connecting.

## Data we use and why

| Field | Source | Purpose | Retained |
|---|---|---|---|
| distance_km | Strava activity | Session logging | Yes — Kita native |
| duration_seconds | Strava activity | Session logging | Yes — Kita native |
| avg_heart_rate | Strava activity | Athlete welfare monitoring | Yes — athlete physiology |
| max_heart_rate | Strava activity | Athlete welfare monitoring | Yes — athlete physiology |
| strava_activity_id | Strava activity | View on Strava link | Yes — while connected |
| garmin_sourced | Derived at ingest | Identifies athlete sessions recorded on a Garmin device | Yes |
| map_polyline | Strava activity | N/A | No — not stored |

### A note on heart rate data

In Kita's club run workflow, heart rate monitors are not worn by the coach. Before each
run, the coach physically attaches an external HR monitor to each athlete's arm. The
monitor syncs to Strava via the coach's device. Heart rate data therefore represents
each athlete's physiology, not the coach's.

For Special Olympics athletes, longitudinal heart rate data during exertion is the
primary mechanism coaches and caregivers have to detect abnormal responses and track
fitness over time. This data is retained associated with each athlete's session record
for welfare monitoring purposes only. It is not used for performance analytics,
advertising, or any commercial purpose.

## What we do not store

- Activity photos — coaches upload photos directly to Kita
- Route and polyline data — not stored at any point
- Private activity data — not accessible under activity:read scope
- Strava activity title — used for hashtag matching at ingest time only, not persisted

## On deauthorization

When a coach disconnects their Strava account, Kita:

1. Hard-deletes all Strava-sourced photos from Supabase Storage
2. Clears Strava-specific fields on all matched sessions (strava_activity_id,
   avg_heart_rate, max_heart_rate, map_polyline)
3. Deletes the strava_connections record
4. Writes a deletion audit log entry with timestamp and counts

Session records themselves are retained as Kita-native coaching history.
distance_km and duration_seconds are retained as they represent
confirmed session data independent of their Strava origin.

## Consent

Before connecting their Strava account, coaches see a disclosure screen explaining
what data will be accessed and who within their club will see it. Consent is logged
with a timestamp and consent version in the strava_consent_log table.

## Attribution

All surfaces displaying Strava-sourced session data show:

- **Powered by Strava** logo per Strava API Brand Guidelines
- **View on Strava** text link to the original activity (where strava_activity_id
  is available)
- **Works with Garmin Connect** badge on sessions where the recording device was
  a Garmin device (garmin_sourced = true)

## Webhook events handled

| Event | Action |
|---|---|
| activity create | Fetch activity, run matching algorithm, create session |
| activity delete | Retain existing Kita session record, log event |
| deauthorization | Delete photos, clear Strava fields, log deletion |

## Community Application status

Kita has applied to Strava for Community Application classification under §2.10 of
the Strava API Agreement. Kita meets the criteria as a free, open-source,
non-commercial application whose primary purpose is organising and coordinating
group training activities for Special Olympics athletes.

## Questions

For questions about this integration, contact hello@kitarun.com.
