using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ConnectDynamics_with_framework.FrontOffice.Services.Helpers
{
	public class CaseConversionHelper
	{
        public static string ConvertCaseTypeCode(int caseTypeCode)
        {
            switch (caseTypeCode)
            {
                case 1: return "question";
                case 2: return "problem";
                case 3: return "request";
                default: return null;
            }
        }
        public static string ConvertPriorityCode(int priorityCode)
        {
            switch (priorityCode)
            {
                case 1: return "high";
                case 2: return "medium";
                case 3: return "low";
                default: return null;
            }
        }

        public static string ConvertStatusCode(int statusCode)
        {
            switch (statusCode)
            {
                case 1: return "in progress";
                case 2: return "on hold";
                case 3: return "waiting for details";
                case 4: return "researching";
                default: return "in progress";
            }
        }

        public static string ConvertCaseStageCode(int incidentstagecode)
        {
            switch (incidentstagecode)
            {
                case 1: return "Proposed";
                case 2: return "Active";
                case 3: return "Resolved";
                case 4: return "Cancelled";
                default: return "Proposed";
            }
        }

        public static string ConvertOriginCode(int caseorigincode)
        {
            switch (caseorigincode)
            {
                case 1: return "Phone";
                case 2: return "Email";
                case 3: return "Web";
                case 2483: return "Facebook";
                case 3986: return "Twitter";
                case 700610000: return "IoT";
                default: return "Phone";



            }
        }

        public static string ConvertCustomerSatisfaction(int customersatisfactioncode)
        {
            switch (customersatisfactioncode)
            {
                case 1: return "Very Dissatisfied";
                case 2: return "Dissatisfied";
                case 3: return "Neutral";
                case 4: return "Satisfied";
                case 5: return "Very Satisfied";
                default: return "N/A";
            }
        }

        public static int ConvertStatusToCode(string status)
        {
            switch (status.ToLower())
            {
                case "in progress": return 1;
                case "on hold": return 2;
                case "waiting for details": return 3;
                case "researching": return 4;
                default: return 1; // Par défaut "in progress"
            }
        }

        public static int ConvertStageToCode(string stage)
        {
            switch (stage.ToLower())
            {
                case "proposed": return 1;
                case "active": return 2;
                case "resolved": return 3;
                case "cancelled": return 4;
                default: return 1; // Par défaut "Proposed"
            }
        }
    }
}