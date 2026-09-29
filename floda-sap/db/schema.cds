namespace floda.hackathon;

entity Manifests {
  key manifest_id: String;
  commodity_type: String;
  origin: String;
  destination: String;
  weight_kg: Decimal(10, 2);
  volume_cbm: Decimal(10, 2);
  substitutability: Decimal(3, 2);
  cover_clock_hours: Integer;
  degradation_clock_hours: Integer;
  carriage_constraint: String;
  composite_score: Decimal(5, 3);
  status: String;
  created_at: Timestamp;
}

entity Chokepoints {
  key chokepoint_id: String;
  location: String;
  chokepoint_type: String;
  severity: String;  // low | medium | high | critical
  affected_routes: String;
  capacity_reduction_percent: Integer;
  estimated_resolution_hours: Integer;
  status: String;
  created_at: Timestamp;
}

entity Rankings {
  key ranking_id            : String;
  manifest_id                : String;
  chokepoint_id               : String;
  priority_rank                : Integer;
  composite_score              : Decimal;
  substitutability_score       : Decimal;
  cover_clock_score            : Decimal;
  degradation_clock_score      : Decimal;
  carriage_fit_score           : Decimal;
  allocated                    : String;
  requires_approval            : Boolean;
  approval_status               : String;  // 'pending' | 'approved' | 'rejected' | 'not_required'
  approved_by                   : String;
  approved_at                   : DateTime;
  created_at                    : DateTime;
}

entity AuditLog {
  key log_id: String;
  ranking_id: String;
  action: String;
  decision_rationale: String;
  parameter_values: String;
  timestamp: Timestamp;
  actor: String;
}

entity InventoryPlans {
  key plan_id: String;
  chokepoint_id: String;
  commodity_type: String;
  recommended_safety_stock_delta: Integer; // can be negative or positive
  rationale: String;
  created_at: DateTime;
}
