sap.ui.define([
  "./BaseController", "sap/ui/model/json/JSONModel", "sap/m/MessageToast", "sap/m/MessageBox"
], function (BaseController, JSONModel, MessageToast, MessageBox) {
  "use strict";

  return BaseController.extend("com.hacksparrow.floda.controller.Main", {
    onInit: function () {
      this._serviceUrl = "/odata/v4/ranking/";
      this.setModel(new JSONModel({
        summary: { manifests: 0, pending: 0, autoExecuted: 0 }, rankings: [], approvals: [], audit: [],
        disruption: { location: "Suez Canal", chokepoint_type: "customs_delay", severity: "high", affected_routes: "Asia-Europe", capacity_reduction_percent: 60, estimated_resolution_hours: 120 }
      }), "view");
      this._loadDashboard();
    },

    onResetDemo: async function () {
      try {
        const result = await this._postAction("resetAndSeed", {});
        MessageToast.show(result.message || "Demo scenarios loaded.");
        await this._loadDashboard();
      } catch (error) { this._showError(error); }
    },

    onTriggerDisruption: async function () {
      const disruption = this.getModel("view").getProperty("/disruption");
      if (!disruption.location || !disruption.affected_routes) {
        MessageBox.warning("Enter a location and affected routes before triggering the disruption.");
        return;
      }
      try {
        await this._postAction("ingestChokepoint", disruption);
        MessageToast.show("Disruption sensed. Scenario Planning and Rerouting Agents refreshed the priority queue.");
        await this._loadDashboard();
        this.byId("screenTabs").setSelectedKey("rankings");
      } catch (error) { this._showError(error); }
    },

    onRefresh: async function () { await this._loadDashboard(); MessageToast.show("Command center refreshed."); },
    onTabSelect: function () { this._loadDashboard(); },

    onApprove: async function (event) { await this._decide(event, "approveAllocation", false); },
    onReject: async function (event) { await this._decide(event, "rejectAllocation", true); },

    _decide: async function (event, action, requireReason) {
      const entry = event.getSource().getBindingContext("view").getObject();
      if (!entry.approver_name || !entry.approver_name.trim()) { MessageBox.warning("Enter the reviewer name before recording this decision."); return; }
      if (requireReason && (!entry.rejection_reason || !entry.rejection_reason.trim())) { MessageBox.warning("Enter a reason before rejecting an allocation."); return; }
      try {
        const payload = { ranking_id: entry.ranking_id, approver_name: entry.approver_name };
        if (requireReason) { payload.reason = entry.rejection_reason; }
        const result = await this._postAction(action, payload);
        MessageToast.show(result.message || "Allocation decision recorded.");
        await this._loadDashboard();
      } catch (error) { this._showError(error); }
    },

    _loadDashboard: async function () {
      try {
        const results = await Promise.all([
          this._getCollection("Manifests"), this._getCollection("rankedManifests()"), this._getCollection("pendingApprovals()"),
          this._getCollection("AuditLog?$orderby=timestamp%20desc"), this._getCollection("Rankings?$filter=approval_status%20eq%20'not_required'")
        ]);
        const manifests = results[0], rankings = results[1], approvals = results[2], audit = results[3], autoExecuted = results[4];
        const manifestMap = new Map(manifests.map(manifest => [manifest.manifest_id, manifest]));
        const enrich = ranking => this._enrichRanking(ranking, manifestMap);
        const viewModel = this.getModel("view");
        viewModel.setProperty("/rankings", rankings.map(enrich).sort((a, b) => a.priority_rank - b.priority_rank));
        viewModel.setProperty("/approvals", approvals.map(enrich).sort((a, b) => a.priority_rank - b.priority_rank));
        viewModel.setProperty("/audit", audit.map(item => Object.assign({}, item, { actorLabel: this._agentLabel(item.actor || "") })));
        viewModel.setProperty("/summary", { manifests: manifests.length, pending: approvals.length, autoExecuted: autoExecuted.length });
      } catch (error) { console.error("Unable to load FLODA dashboard", error); }
    },

    _enrichRanking: function (ranking, manifestMap) {
      const manifest = manifestMap.get(ranking.manifest_id) || {};
      const reasons = [];
      if (Number(ranking.priority_rank) === 1) { reasons.push("#1 priority allocation"); }
      if (manifest.carriage_constraint === "hazmat") { reasons.push("hazmat cargo"); }
      if (Number(manifest.weight_kg) > 10000) { reasons.push("shipment exceeds 10,000 kg"); }
      return Object.assign({}, ranking, {
        commodity_type: manifest.commodity_type || "Unknown", escalationReason: reasons.join(" • ") || "Policy guardrail",
        approver_name: "", rejection_reason: "", allocatedText: ranking.allocated === "Y" ? "AUTO-EXECUTED" : "PENDING",
        approvalText: ranking.requires_approval ? "REVIEW REQUIRED" : "NO REVIEW",
        rowState: ranking.allocated === "Y" ? "allocated" : ranking.requires_approval && ranking.approval_status === "pending" ? "pending" : "neutral"
      });
    },

    _getCollection: async function (path) {
      const response = await fetch(this._serviceUrl + path, { headers: { Accept: "application/json" } });
      if (!response.ok) { throw new Error("Service request failed (" + response.status + ")."); }
      const json = await response.json();
      return json.value || [];
    },

    _postAction: async function (action, payload) {
      const response = await fetch(this._serviceUrl + action, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) });
      const json = await response.json();
      if (!response.ok) { throw new Error((json.error && json.error.message) || "Action failed (" + response.status + ")."); }
      return json.value || json;
    },

    _agentLabel: function (actor) {
      if (actor.includes("DISRUPTION")) { return "DISRUPTION SENSING"; }
      if (actor.includes("HUMAN")) { return "HUMAN REVIEWER"; }
      if (actor.includes("REROUTING")) { return "REROUTING & LOGISTICS"; }
      return "SCENARIO PLANNING";
    },
    _showError: function (error) { MessageBox.error(error.message || "The command could not be completed."); }
  });
});
