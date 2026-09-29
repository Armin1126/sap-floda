using { floda.hackathon as db } from '../db/schema';

service RankingService {
  entity Manifests as projection on db.Manifests;
  entity Chokepoints as projection on db.Chokepoints;
  entity Rankings as projection on db.Rankings;
  entity AuditLog as projection on db.AuditLog;
  entity InventoryPlans as projection on db.InventoryPlans;

  action ingestManifest(
    commodity_type: String,
    origin: String,
    destination: String,
    weight_kg: Decimal,
    volume_cbm: Decimal,
    substitutability: Decimal,
    cover_clock_hours: Integer,
    degradation_clock_hours: Integer,
    carriage_constraint: String
  ) returns { success: Boolean; manifest_id: String; message: String };

  action ingestChokepoint(
    location: String,
    chokepoint_type: String,
    severity: String,
    affected_routes: String,
    capacity_reduction_percent: Integer,
    estimated_resolution_hours: Integer
  ) returns { success: Boolean; chokepoint_id: String; message: String };

  function rankedManifests() returns array of Rankings;

  function inventoryRecommendations() returns array of InventoryPlans;

  type DemoScenario {
    manifest_id: String;
    commodity_type: String;
    weight_kg: Decimal;
    volume_cbm: Decimal;
    substitutability: Decimal;
    cover_clock_hours: Integer;
    degradation_clock_hours: Integer;
    carriage_constraint: String;
  }

  type SeedResult {
    success: Boolean;
    message: String;
    manifests_loaded: Integer;
    chokepoints_loaded: Integer;
  }
  type ApprovalResult {
    success: Boolean;
    message: String;
    ranking_id: String;
  }

  action approveAllocation(ranking_id: String, approver_name: String) returns ApprovalResult;
  action rejectAllocation(ranking_id: String, approver_name: String, reason: String) returns ApprovalResult;
  function pendingApprovals() returns array of Rankings;
  action resetAndSeed() returns SeedResult;
}
