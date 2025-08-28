using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ConnectDynamics_with_framework.FrontOffice.Models.Requests
{
	public class UpdateCaseStageWithReasonRequest
	{
        public string CaseId { get; set; }
        public string NewStage { get; set; }
        public string CancellationReason { get; set; }
    }
}