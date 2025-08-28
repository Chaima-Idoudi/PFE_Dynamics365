using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ConnectDynamics_with_framework
{
	public class CaseImageDto
	{
        public string FileName { get; set; }
        public string MimeType { get; set; }
        // document body en base64
        public string DocumentBody { get; set; }
    }
}