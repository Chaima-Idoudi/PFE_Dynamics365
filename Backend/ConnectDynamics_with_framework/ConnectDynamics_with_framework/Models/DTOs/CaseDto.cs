using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ConnectDynamics_with_framework.Models.DTOs
{
	public class CaseDto
	{
        public Guid IncidentId { get; set; }
        public string Stage { get; set; }
        public string Note { get; set; }
        public string State { get; set; }
        public string CaseNumber { get; set; }
        public string Title { get; set; }
        public string Subject { get; set; }
        public DateTime? CreatedOn { get; set; }  
        public DateTime? ModifiedOn { get; set; }
        public string CaseType { get; set; }
        public bool? ActivitiesComplete { get; set; }
        public string Description { get; set; }
        public string Owner { get; set; }
        public string Priority { get; set; }
        public string Status { get; set; }
        public string Origin { get; set; }
        public string Customer_satisfaction { get; set; }
        public CustomerDto Customer { get; set; }
        public string ImageBase64 { get; set; }
        public List<CaseImageDto> Images { get; set; } = new List<CaseImageDto>();
        public string CancellationReason { get; set; }
        public DateTime? CancellationDate { get; set; }


    }
}