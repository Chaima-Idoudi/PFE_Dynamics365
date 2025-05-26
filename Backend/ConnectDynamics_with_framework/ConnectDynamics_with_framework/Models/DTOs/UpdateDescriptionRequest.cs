using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ConnectDynamics_with_framework.FrontOffice.Models.RequestsModels
{
	public class UpdateDescriptionRequest
	{
        public string CaseId { get; set; }
        public string NewDescription { get; set; }
    }
}