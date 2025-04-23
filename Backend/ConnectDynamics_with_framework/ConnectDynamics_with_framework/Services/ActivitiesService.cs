using ConnectDynamics_with_framework.Models.DTOs;
using ConnectDynamics_with_framework.Services.Interfaces;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using StackExchange.Redis;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Web;
using System.Web.Http;

namespace ConnectDynamics_with_framework.Services
{
    public class ActivitiesService : IActivitiesService
    {
        private readonly CrmServiceProvider _crmServiceProvider;
        private readonly IDatabase _redisDatabase;

        public ActivitiesService(CrmServiceProvider crmServiceProvider, IDatabase redisDatabase)
        {
            _crmServiceProvider = crmServiceProvider;
            _redisDatabase = redisDatabase;
        }

        private string ConvertPriorityCode(int priorityCode)
        {
            switch (priorityCode)
            {
                case 1: return "high";
                case 2: return "medium";
                case 3: return "low";
                default: return null;
            }
        }

        public List<ActivityDto> getActivities()
        {
            var request = HttpContext.Current.Request;
            var userIdStr = request.Headers["Authorization"] ?? request.ServerVariables["HTTP_AUTHORIZATION"];

            if (string.IsNullOrEmpty(userIdStr) || !_redisDatabase.KeyExists($"sessions:{userIdStr}"))
            {
                throw new HttpResponseException(HttpStatusCode.Unauthorized); // L'utilisateur n'est pas connecté
            }

            if (!Guid.TryParse(userIdStr, out Guid currentUserId))
            {
                throw new HttpResponseException(HttpStatusCode.Unauthorized); // Identifiant utilisateur invalide
            }

            try
            {
                using (var service = _crmServiceProvider.GetService())
                {
                    if (service == null || !service.IsReady)
                    {
                        throw new Exception("La connexion à Dynamics 365 a échoué.");
                    }

                    var query = new QueryExpression("activitypointer")
                    {
                        ColumnSet = new ColumnSet("subject", "scheduledstart", "scheduledend", "activitytypecode", "ownerid", "prioritycode")
                    };

                    var activities = service.RetrieveMultiple(query);
                    var activitiesList = activities.Entities.Select(activity => new ActivityDto
                    {
                        Subject = activity.GetAttributeValue<string>("subject"),
                        ScheduledStart = activity.GetAttributeValue<DateTime?>("scheduledstart"),
                        ScheduledEnd = activity.GetAttributeValue<DateTime?>("scheduledend"),
                        Priority = activity.Contains("prioritycode") && activity["prioritycode"] is OptionSetValue
                            ? ConvertPriorityCode(((OptionSetValue)activity["prioritycode"]).Value)
                            : null,
                        ActivityType = activity.Contains("activitytypecode") && activity["activitytypecode"] is OptionSetValue
                            ? ((OptionSetValue)activity["activitytypecode"]).Value
                            : (int?)null,
                        AssignedTo = activity.Contains("ownerid") && activity["ownerid"] is EntityReference ownerRef
                            ? ownerRef.Name
                            : null

                    }).ToList();
                    return activitiesList;

                }
            }
            catch (Exception ex)
            {
                throw new Exception("Une erreur s'est produite lors de la récupération des utilisateurs.", ex);
            }


        }
    }
}