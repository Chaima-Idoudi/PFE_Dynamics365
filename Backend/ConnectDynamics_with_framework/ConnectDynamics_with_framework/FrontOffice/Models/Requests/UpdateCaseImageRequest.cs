using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ConnectDynamics_with_framework.FrontOffice.Models.Requests
{
	public class UpdateCaseImageRequest
	{
        public string CaseId { get; set; }
        // We'll use base64 string for the image data when sending via JSON
        public string ImageBase64 { get; set; }
    }
}