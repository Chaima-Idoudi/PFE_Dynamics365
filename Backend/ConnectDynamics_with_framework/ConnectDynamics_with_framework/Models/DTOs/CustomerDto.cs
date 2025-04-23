using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ConnectDynamics_with_framework.Models.DTOs
{
	public class CustomerDto
	{
        public Guid Id { get; set; } // accountid
        public string Name { get; set; } // name
        public string AccountNumber { get; set; } // accountnumber
        public string Email { get; set; } // emailaddress1
        public string PhoneNumber { get; set; } // telephone1
        public string Country  { get; set; } // address1_county
        public string City { get; set; } // address1_city
        public string Description { get; set; } // description
        public string Fax { get; set; } // fax
        public string LogicalName { get; set; }
    }
}