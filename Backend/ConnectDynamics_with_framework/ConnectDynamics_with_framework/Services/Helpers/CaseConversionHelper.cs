using Microsoft.Xrm.Sdk;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Web;

namespace ConnectDynamics_with_framework.Services.Helpers
{
	public class CaseConversionHelper
    {
        public static int ConvertCaseTypeCodeInverse(string caseType)
        {
            switch (caseType.ToLower())
            {
                case "question":
                    return 1;
                case "problem":
                    return 2;
                case "request":
                    return 3;
                default:
                    throw new ArgumentException("Valeur invalide pour CaseType.");
            }
        }

        public static int ConvertPriorityCodeInverse(string priority)
        {
            switch (priority.ToLower())
            {
                case "high":
                    return 1;
                case "medium":
                    return 2;
                case "low":
                    return 3;
                default:
                    throw new ArgumentException("Valeur invalide pour Priority.");
            }
        }

        public static int ConvertStatusCodeInverse(string status)
        {
            switch (status.ToLower())
            {
                case "in progress":
                    return 1;
                case "on hold":
                    return 2;
                case "waiting for details":
                    return 3;
                case "researching":
                    return 4;
                default:
                    throw new ArgumentException("Valeur invalide pour Status.");
            }
        }

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

        public static string ConvertCaseStageCode(int statusCode)
        {
            switch (statusCode)
            {
                case 1: return "Proposed";
                case 2: return "Active";
                case 3: return "resolved";
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
    }
}
