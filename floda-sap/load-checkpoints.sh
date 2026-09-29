#!/bin/bash

BASE_URL="http://localhost:34425/odata/v4/ranking"

echo "Loading 20 India-focused chokepoints into FLODA..."

# CP_IND_001
curl -s -X POST $BASE_URL/ingestChokepoint -H "Content-Type: application/json" -d '{
  "location": "Nhava Sheva (JNPT) Mumbai",
  "chokepoint_type": "port_congestion",
  "severity": "critical",
  "affected_routes": "India-Gulf Route,India-Europe Route",
  "capacity_reduction_percent": 72,
  "estimated_resolution_hours": 48
}' | grep -o '"success":[^,]*'

# CP_IND_002
curl -s -X POST $BASE_URL/ingestChokepoint -H "Content-Type: application/json" -d '{
  "location": "Chennai Port",
  "chokepoint_type": "cyclone_warning",
  "severity": "critical",
  "affected_routes": "India-Singapore Route,India-SE Asia Route",
  "capacity_reduction_percent": 88,
  "estimated_resolution_hours": 72
}' | grep -o '"success":[^,]*'

# CP_IND_003
curl -s -X POST $BASE_URL/ingestChokepoint -H "Content-Type: application/json" -d '{
  "location": "Mundra Port Gujarat",
  "chokepoint_type": "berth_unavailability",
  "severity": "high",
  "affected_routes": "India-Europe Route,India-Gulf Route",
  "capacity_reduction_percent": 61,
  "estimated_resolution_hours": 36
}' | grep -o '"success":[^,]*'

# CP_IND_004
curl -s -X POST $BASE_URL/ingestChokepoint -H "Content-Type: application/json" -d '{
  "location": "Kolkata (Syama Prasad Mookerjee Port)",
  "chokepoint_type": "channel_siltation",
  "severity": "high",
  "affected_routes": "India-Bangladesh Route,Bay of Bengal Route",
  "capacity_reduction_percent": 48,
  "estimated_resolution_hours": 96
}' | grep -o '"success":[^,]*'

# CP_IND_005
curl -s -X POST $BASE_URL/ingestChokepoint -H "Content-Type: application/json" -d '{
  "location": "Visakhapatnam Port",
  "chokepoint_type": "equipment_failure",
  "severity": "high",
  "affected_routes": "India-East Asia Route,Bay of Bengal Route",
  "capacity_reduction_percent": 62,
  "estimated_resolution_hours": 30
}' | grep -o '"success":[^,]*'

# CP_IND_006
curl -s -X POST $BASE_URL/ingestChokepoint -H "Content-Type: application/json" -d '{
  "location": "Ganga Waterway NW-1 (Varanasi-Haldia)",
  "chokepoint_type": "low_water_levels",
  "severity": "high",
  "affected_routes": "Kolkata-Varanasi Waterway,North India Inland",
  "capacity_reduction_percent": 65,
  "estimated_resolution_hours": 120
}' | grep -o '"success":[^,]*'

# CP_IND_007
curl -s -X POST $BASE_URL/ingestChokepoint -H "Content-Type: application/json" -d '{
  "location": "Kochi Port Kerala",
  "chokepoint_type": "monsoon_disruption",
  "severity": "high",
  "affected_routes": "India-Gulf Route,India-East Africa Route",
  "capacity_reduction_percent": 51,
  "estimated_resolution_hours": 54
}' | grep -o '"success":[^,]*'

# CP_IND_008
curl -s -X POST $BASE_URL/ingestChokepoint -H "Content-Type: application/json" -d '{
  "location": "Kandla (Deendayal) Port",
  "chokepoint_type": "hazmat_incident",
  "severity": "critical",
  "affected_routes": "India-Gulf Route,Gujarat Coastal Route",
  "capacity_reduction_percent": 80,
  "estimated_resolution_hours": 96
}' | grep -o '"success":[^,]*'

# CP_IND_009
curl -s -X POST $BASE_URL/ingestChokepoint -H "Content-Type: application/json" -d '{
  "location": "Tuticorin (V.O. Chidambaranar) Port",
  "chokepoint_type": "labour_strike",
  "severity": "medium",
  "affected_routes": "India-Sri Lanka Route,India-SE Asia Route",
  "capacity_reduction_percent": 42,
  "estimated_resolution_hours": 72
}' | grep -o '"success":[^,]*'

# CP_IND_010
curl -s -X POST $BASE_URL/ingestChokepoint -H "Content-Type: application/json" -d '{
  "location": "Paradip Port Odisha",
  "chokepoint_type": "cyclone_warning",
  "severity": "high",
  "affected_routes": "Bay of Bengal Route,India-East Asia Route",
  "capacity_reduction_percent": 58,
  "estimated_resolution_hours": 60
}' | grep -o '"success":[^,]*'

# CP_IND_011
curl -s -X POST $BASE_URL/ingestChokepoint -H "Content-Type: application/json" -d '{
  "location": "Delhi-NCR ICD Tughlakabad",
  "chokepoint_type": "customs_backlog",
  "severity": "medium",
  "affected_routes": "North India Corridor,Delhi-JNPT Rail Route",
  "capacity_reduction_percent": 38,
  "estimated_resolution_hours": 18
}' | grep -o '"success":[^,]*'

# CP_IND_012
curl -s -X POST $BASE_URL/ingestChokepoint -H "Content-Type: application/json" -d '{
  "location": "Dedicated Freight Corridor (Rewari-Palanpur)",
  "chokepoint_type": "track_maintenance",
  "severity": "medium",
  "affected_routes": "Delhi-JNPT Rail Route,North-West Freight Corridor",
  "capacity_reduction_percent": 33,
  "estimated_resolution_hours": 30
}' | grep -o '"success":[^,]*'

# CP_IND_013
curl -s -X POST $BASE_URL/ingestChokepoint -H "Content-Type: application/json" -d '{
  "location": "Pune-Mumbai Expressway",
  "chokepoint_type": "monsoon_flooding",
  "severity": "high",
  "affected_routes": "Western India Corridor,Pune-JNPT Route",
  "capacity_reduction_percent": 52,
  "estimated_resolution_hours": 24
}' | grep -o '"success":[^,]*'

# CP_IND_014
curl -s -X POST $BASE_URL/ingestChokepoint -H "Content-Type: application/json" -d '{
  "location": "Bengaluru Air Cargo (KIAL)",
  "chokepoint_type": "peak_season_surge",
  "severity": "medium",
  "affected_routes": "India-International Air Routes,South India Air Feeder",
  "capacity_reduction_percent": 35,
  "estimated_resolution_hours": 12
}' | grep -o '"success":[^,]*'

# CP_IND_015
curl -s -X POST $BASE_URL/ingestChokepoint -H "Content-Type: application/json" -d '{
  "location": "Hyderabad Warehouse Cluster (Medchal)",
  "chokepoint_type": "regulatory_inspection",
  "severity": "low",
  "affected_routes": "Hyderabad-Bengaluru Corridor,South India Routes",
  "capacity_reduction_percent": 18,
  "estimated_resolution_hours": 6
}' | grep -o '"success":[^,]*'

# CP_IND_016
curl -s -X POST $BASE_URL/ingestChokepoint -H "Content-Type: application/json" -d '{
  "location": "Ludhiana Industrial Hub Punjab",
  "chokepoint_type": "power_shortage",
  "severity": "medium",
  "affected_routes": "Punjab Industrial Routes,North India Corridor",
  "capacity_reduction_percent": 24,
  "estimated_resolution_hours": 8
}' | grep -o '"success":[^,]*'

# CP_IND_017
curl -s -X POST $BASE_URL/ingestChokepoint -H "Content-Type: application/json" -d '{
  "location": "Ahmedabad Textile Cluster",
  "chokepoint_type": "supplier_delay",
  "severity": "low",
  "affected_routes": "Gujarat Routes,Western India Corridor",
  "capacity_reduction_percent": 15,
  "estimated_resolution_hours": 10
}' | grep -o '"success":[^,]*'

# CP_IND_018
curl -s -X POST $BASE_URL/ingestChokepoint -H "Content-Type: application/json" -d '{
  "location": "Guwahati ICD Assam",
  "chokepoint_type": "border_clearance",
  "severity": "medium",
  "affected_routes": "North-East India Routes,India-Bangladesh Route",
  "capacity_reduction_percent": 40,
  "estimated_resolution_hours": 24
}' | grep -o '"success":[^,]*'

# CP_IND_019
curl -s -X POST $BASE_URL/ingestChokepoint -H "Content-Type: application/json" -d '{
  "location": "Indore Rail Junction Madhya Pradesh",
  "chokepoint_type": "rolling_stock_shortage",
  "severity": "medium",
  "affected_routes": "Central India Rail Routes,Delhi-JNPT Rail Route",
  "capacity_reduction_percent": 28,
  "estimated_resolution_hours": 20
}' | grep -o '"success":[^,]*'

# CP_IND_020
curl -s -X POST $BASE_URL/ingestChokepoint -H "Content-Type: application/json" -d '{
  "location": "Attari-Wagah Land Port Punjab",
  "chokepoint_type": "regulatory_closure",
  "severity": "low",
  "affected_routes": "India-Central Asia Land Route",
  "capacity_reduction_percent": 22,
  "estimated_resolution_hours": 16
}' | grep -o '"success":[^,]*'

echo ""
echo "✓ Chokepoint data load complete!"
echo ""
echo "Verify with:"
echo "  curl http://localhost:34425/odata/v4/ranking/Chokepoints"