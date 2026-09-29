sap.ui.define([], function () {
  "use strict";
  return {
    rowHighlight: function (state) { return state === "allocated" ? "Success" : state === "pending" ? "Warning" : "None"; },
    allocatedState: function (value) { return value === "Y" ? "Success" : "Warning"; },
    approvalState: function (value) { return value ? "Error" : "Success"; },
    actorState: function (actor) { return actor.includes("HUMAN") ? "Information" : actor.includes("REROUTING") ? "Warning" : "Information"; },
    timestamp: function (value) { return value ? new Date(value).toLocaleString() : ""; }
  };
});
