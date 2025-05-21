using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ConnectDynamics_with_framework.FrontOffice.Models.RequestsModels
{
	public class UpdateCaseStatusRequest
	{
        public string CaseId { get; set; }
        public string NewStatus { get; set; }
    }
}