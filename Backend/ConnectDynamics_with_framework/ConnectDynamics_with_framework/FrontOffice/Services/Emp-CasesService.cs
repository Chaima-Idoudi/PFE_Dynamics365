using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Web;
using System.Web.Http;
using ConnectDynamics_with_framework.FrontOffice.Services.Interfaces;
using ConnectDynamics_with_framework.Models.DTOs;
using ConnectDynamics_with_framework.Services;
using Microsoft.Xrm.Sdk.Query;
using Microsoft.Xrm.Sdk;
using StackExchange.Redis;
using ConnectDynamics_with_framework.FrontOffice.Services.Helpers;

namespace ConnectDynamics_with_framework.FrontOffice.Services
{
    public class Emp_CaseService : IEmp_CasesService
    {
        private readonly CrmServiceProvider _crmServiceProvider;
        private readonly IDatabase _redisDatabase;

        public Emp_CaseService(CrmServiceProvider crmServiceProvider, IDatabase redisDatabase)
        {
            _crmServiceProvider = crmServiceProvider;
            _redisDatabase = redisDatabase;
        }

        public List<CaseDto> GetMyCases()
        {
            var request = System.Web.HttpContext.Current.Request;
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

                    var query = new QueryExpression("incident")
                    {
                        ColumnSet = new ColumnSet(
                            "incidentid", "incidentstagecode", "ticketnumber", "title", "createdon", "casetypecode",
                            "activitiescomplete", "description", "ownerid", "prioritycode", "statuscode",
                            "caseorigincode", "customersatisfactioncode", "customerid", "modifiedon", "subjectid","cr9bc_note", "entityimage")
                    };

                    // Ajouter une condition pour filtrer les cas assignés à l'utilisateur connecté
                    query.Criteria.AddCondition("ownerid", ConditionOperator.Equal, currentUserId);

                    var cases = service.RetrieveMultiple(query);

                    var casesList = cases.Entities.Select(c =>
                    {
                        var customerRef = c.GetAttributeValue<EntityReference>("customerid");
                        CustomerDto customerDto = null;

                        if (customerRef != null)
                        {
                            try
                            {
                                var customerEntity = service.Retrieve(customerRef.LogicalName, customerRef.Id, new ColumnSet(
                                    "name", "accountnumber", "emailaddress1", "telephone1",
                                    "address1_county", "address1_city", "description", "fax"
                                ));

                                customerDto = new CustomerDto
                                {
                                    Id = customerEntity.Id,
                                    Name = customerEntity.GetAttributeValue<string>("name"),
                                    AccountNumber = customerEntity.GetAttributeValue<string>("accountnumber"),
                                    Email = customerEntity.GetAttributeValue<string>("emailaddress1"),
                                    PhoneNumber = customerEntity.GetAttributeValue<string>("telephone1"),
                                    Country = customerEntity.GetAttributeValue<string>("address1_county"),
                                    City = customerEntity.GetAttributeValue<string>("address1_city"),
                                    Description = customerEntity.GetAttributeValue<string>("description"),
                                    Fax = customerEntity.GetAttributeValue<string>("fax"),
                                    LogicalName = customerRef.LogicalName
                                };
                            }
                            catch
                            {
                                customerDto = null;
                            }
                        }

                        string imageBase64 = null;
                        if (c.Contains("entityimage") && c.GetAttributeValue<byte[]>("entityimage") != null)
                        {
                            byte[] imageData = c.GetAttributeValue<byte[]>("entityimage");
                            imageBase64 = Convert.ToBase64String(imageData);
                        }

                        return new CaseDto
                        {
                            IncidentId = c.Id,
                            Stage = c.Contains("incidentstagecode") && c.GetAttributeValue<OptionSetValue>("incidentstagecode") != null
                                ? CaseConversionHelper.ConvertCaseStageCode(c.GetAttributeValue<OptionSetValue>("incidentstagecode").Value)
                                : null,
                            CaseNumber = c.GetAttributeValue<string>("ticketnumber"),
                            Title = c.GetAttributeValue<string>("title"),
                            Note = c.GetAttributeValue<string>("cr9bc_note"),
                            CreatedOn = c.GetAttributeValue<DateTime?>("createdon"),
                            ModifiedOn = c.GetAttributeValue<DateTime?>("modifiedon"),
                            Subject = c.GetAttributeValue<EntityReference>("subjectid")?.Name,
                            CaseType = c.Contains("casetypecode") && c.GetAttributeValue<OptionSetValue>("casetypecode") != null
                                ? CaseConversionHelper.ConvertCaseTypeCode(c.GetAttributeValue<OptionSetValue>("casetypecode").Value)
                                : null,
                            ActivitiesComplete = c.GetAttributeValue<bool?>("activitiescomplete"),
                            Description = c.GetAttributeValue<string>("description"),
                            Owner = c.GetAttributeValue<EntityReference>("ownerid")?.Name,
                            Priority = c.Contains("prioritycode") && c.GetAttributeValue<OptionSetValue>("prioritycode") != null
                                ? CaseConversionHelper.ConvertPriorityCode(c.GetAttributeValue<OptionSetValue>("prioritycode").Value)
                                : null,
                            Status = c.Contains("statuscode") && c.GetAttributeValue<OptionSetValue>("statuscode") != null
                                ? CaseConversionHelper.ConvertStatusCode(c.GetAttributeValue<OptionSetValue>("statuscode").Value)
                                : null,
                            Origin = c.Contains("caseorigincode") && c.GetAttributeValue<OptionSetValue>("caseorigincode") != null
                                ? CaseConversionHelper.ConvertOriginCode(c.GetAttributeValue<OptionSetValue>("caseorigincode").Value)
                                : null,
                            Customer_satisfaction = c.Contains("customersatisfactioncode") && c.GetAttributeValue<OptionSetValue>("customersatisfactioncode") != null
                                ? CaseConversionHelper.ConvertCustomerSatisfaction(c.GetAttributeValue<OptionSetValue>("customersatisfactioncode").Value)
                                : null,
                            Customer = customerDto,
                            ImageBase64 = imageBase64,
                        };
                    }).ToList();

                    return casesList;
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Une erreur s'est produite lors de la récupération des cas de l'employé connecté.", ex);
            }
        }

        public string UpdateCaseStage(Guid caseId, string newStage)
        {
            var request = System.Web.HttpContext.Current.Request;
            var userIdStr = request.Headers["Authorization"] ?? request.ServerVariables["HTTP_AUTHORIZATION"];

            if (string.IsNullOrEmpty(userIdStr) || !_redisDatabase.KeyExists($"sessions:{userIdStr}"))
            {
                throw new HttpResponseException(HttpStatusCode.Unauthorized);
            }

            try
            {
                using (var service = _crmServiceProvider.GetService())
                {
                    if (service == null || !service.IsReady)
                    {
                        throw new Exception("La connexion à Dynamics 365 a échoué.");
                    }

                    // Récupérer le cas pour vérifier qu'il appartient bien à l'utilisateur
                    var caseEntity = service.Retrieve("incident", caseId, new ColumnSet("ownerid"));
                    var ownerRef = caseEntity.GetAttributeValue<EntityReference>("ownerid");

                    if (ownerRef == null || ownerRef.Id != new Guid(userIdStr))
                    {
                        throw new HttpResponseException(HttpStatusCode.Forbidden);
                    }

                    // Convertir le stage texte en code Dynamics
                    int stageCode = CaseConversionHelper.ConvertStageToCode(newStage);

                    // Mettre à jour l'entité
                    var entityToUpdate = new Entity("incident", caseId);
                    entityToUpdate["incidentstagecode"] = new OptionSetValue(stageCode);
                    service.Update(entityToUpdate);

                    return $"Le stage de la case (incident: {caseId} a été modifié à {newStage} (code: {stageCode})";
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Une erreur s'est produite lors de la mise à jour du stage du cas.", ex);
            }
        }
        public string UpdateCaseNote(Guid caseId, string newNote)
        {
            ValidateUserAndCaseOwnership(caseId); // Méthode commune de validation

            using (var service = _crmServiceProvider.GetService())
            {
                var entity = new Entity("incident", caseId);
                entity["cr9bc_note"] = newNote;
                service.Update(entity);
                return $"Note mise à jour pour le cas {caseId}";
            }
        }

      

        public void ValidateUserAndCaseOwnership(Guid caseId) 
        {
            var request = System.Web.HttpContext.Current.Request;
            var userIdStr = request.Headers["Authorization"] ?? request.ServerVariables["HTTP_AUTHORIZATION"];

            if (string.IsNullOrEmpty(userIdStr))
                throw new HttpResponseException(HttpStatusCode.Unauthorized);

            if (!_redisDatabase.KeyExists($"sessions:{userIdStr}"))
                throw new HttpResponseException(HttpStatusCode.Unauthorized);

            using (var service = _crmServiceProvider.GetService())
            {
                var caseEntity = service.Retrieve("incident", caseId, new ColumnSet("ownerid"));
                if (caseEntity.GetAttributeValue<EntityReference>("ownerid")?.Id != new Guid(userIdStr))
                    throw new HttpResponseException(HttpStatusCode.Forbidden);
            }
        }


        public string UpdateCaseImage(Guid caseId, byte[] imageData)
        {
            ValidateUserAndCaseOwnership(caseId); 

            using (var service = _crmServiceProvider.GetService())
            {
                if (service == null || !service.IsReady)
                {
                    throw new Exception("La connexion à Dynamics 365 a échoué.");
                }

                var entity = new Entity("incident", caseId);

                // Set the image data
                entity["entityimage"] = imageData;

                service.Update(entity);
                return $"Image mise à jour pour le cas {caseId}";
            }
        }

    }
}