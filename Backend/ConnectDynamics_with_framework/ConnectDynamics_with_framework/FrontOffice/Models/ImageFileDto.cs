using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ConnectDynamics_with_framework.FrontOffice.Models
{
	public class ImageFileDto
	{
        public byte[] Data { get; set; }
        public string FileName { get; set; }
        public string MimeType { get; set; }
    }
}