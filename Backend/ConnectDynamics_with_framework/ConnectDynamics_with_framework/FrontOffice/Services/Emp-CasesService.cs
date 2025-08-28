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
using ConnectDynamics_with_framework.FrontOffice.Models;

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
                throw new HttpResponseException(HttpStatusCode.Unauthorized);

            if (!Guid.TryParse(userIdStr, out Guid currentUserId))
                throw new HttpResponseException(HttpStatusCode.Unauthorized);

            try
            {
                using (var service = _crmServiceProvider.GetService())
                {
                    if (service == null || !service.IsReady)
                        throw new Exception("La connexion à Dynamics 365 a échoué.");

                    // Récupérer les cases où owner = currentUserId
                    var query = new QueryExpression("incident")
                    {
                        ColumnSet = new ColumnSet(
                            "incidentid", "incidentstagecode", "ticketnumber", "title", "createdon", "casetypecode",
                            "activitiescomplete", "description", "ownerid", "prioritycode", "statuscode",
                            "caseorigincode", "customersatisfactioncode", "customerid", "modifiedon", "subjectid", "cr9bc_note", "cr9bc_cancellationreason", "cr9bc_cancellationdate"
                        ),
                        Criteria =
                {
                    Conditions =
                    {
                        new ConditionExpression("ownerid", ConditionOperator.Equal, currentUserId)
                    }
                }
                    };

                    var cases = service.RetrieveMultiple(query);

                    var casesList = cases.Entities.Select(c =>
                    {
                        // Récupération des données client
                        CustomerDto customerDto = null;
                        var customerRef = c.GetAttributeValue<EntityReference>("customerid");
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

                        // Récupérer les images (annotations liées)
                        var images = new List<CaseImageDto>();
                        try
                        {
                            var notesQuery = new QueryExpression("annotation")
                            {
                                ColumnSet = new ColumnSet("documentbody", "mimetype", "filename"),
                                Criteria =
                        {
                            Conditions =
                            {
                                new ConditionExpression("objectid", ConditionOperator.Equal, c.Id),
                                new ConditionExpression("mimetype", ConditionOperator.Like, "image/%")
                            }
                        }
                            };

                            var notes = service.RetrieveMultiple(notesQuery);
                            images = notes.Entities
                                .Select(n => new CaseImageDto
                                {
                                    DocumentBody = n.GetAttributeValue<string>("documentbody"),
                                    MimeType = n.GetAttributeValue<string>("mimetype"),
                                    FileName = n.GetAttributeValue<string>("filename")
                                })
                                .Where(i => !string.IsNullOrEmpty(i.DocumentBody))
                                .ToList();
                        }
                        catch
                        {
                            images = new List<CaseImageDto>();
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
                            Images = images ,
                            CancellationReason = c.GetAttributeValue<string>("cr9bc_cancellationreason"),
                            CancellationDate = c.GetAttributeValue<DateTime?>("cr9bc_cancellationdate"),
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

        public string UpdateCaseImages(Guid caseId, List<ImageFileDto> images)
        {
            // Validation des paramètres d'entrée
            if (images == null || !images.Any())
                throw new ArgumentException("La liste d'images ne peut pas être vide.");

            try
            {
                // Valider que l'utilisateur est propriétaire
                ValidateUserAndCaseOwnership(caseId);

                using (var service = _crmServiceProvider.GetService())
                {
                    if (service == null || !service.IsReady)
                        throw new Exception("La connexion à Dynamics 365 a échoué.");

                    // Compter les images existantes avec une requête plus simple
                    var countQuery = new QueryExpression("annotation")
                    {
                        ColumnSet = new ColumnSet("annotationid"),
                        Criteria = new FilterExpression
                        {
                            FilterOperator = LogicalOperator.And,
                            Conditions =
                    {
                        new ConditionExpression("objectid", ConditionOperator.Equal, caseId),
                        new ConditionExpression("mimetype", ConditionOperator.Like, "image/%")
                    }
                        }
                    };

                    var existing = service.RetrieveMultiple(countQuery);
                    int existingCount = existing?.Entities?.Count ?? 0;

                    // Vérifier la limite avant traitement
                    if (existingCount + images.Count > 10)
                        throw new Exception($"Limite dépassée : le ticket a déjà {existingCount} image(s). Maximum autorisé : 10 au total.");

                    int successCount = 0;
                    var errors = new List<string>();

                    foreach (var img in images)
                    {
                        try
                        {
                            // Validation des données de l'image
                            if (img.Data == null || img.Data.Length == 0)
                            {
                                errors.Add($"Image '{img.FileName}' : données vides");
                                continue;
                            }

                            // Validation du type MIME
                            if (string.IsNullOrEmpty(img.MimeType) || !img.MimeType.StartsWith("image/"))
                            {
                                errors.Add($"Image '{img.FileName}' : type MIME non valide ({img.MimeType})");
                                continue;
                            }

                            // Créer l'annotation
                            var note = new Entity("annotation");
                            note["subject"] = "Photo de résolution";
                            note["notetext"] = "Image ajoutée par le technicien via l'application front-office";
                            note["documentbody"] = Convert.ToBase64String(img.Data);
                            note["mimetype"] = img.MimeType;
                            note["filename"] = string.IsNullOrEmpty(img.FileName) ?
                                $"image_{DateTime.Now:yyyyMMdd_HHmmss}_{Guid.NewGuid().ToString("N").Substring(0, 8)}.jpg" :
                                img.FileName;
                            note["objectid"] = new EntityReference("incident", caseId);

                            // Tentative de création avec retry simple
                            Guid annotationId = Guid.Empty;
                            int retryCount = 0;
                            const int maxRetries = 3;

                            while (retryCount < maxRetries)
                            {
                                try
                                {
                                    annotationId = service.Create(note);
                                    break; // Succès, sortir de la boucle retry
                                }
                                catch (Exception createEx)
                                {
                                    retryCount++;
                                    if (retryCount >= maxRetries)
                                    {
                                        throw new Exception($"Échec après {maxRetries} tentatives : {createEx.Message}");
                                    }
                                    // Attendre un peu avant de réessayer
                                    System.Threading.Thread.Sleep(100 * retryCount);
                                }
                            }

                            if (annotationId != Guid.Empty)
                            {
                                successCount++;
                            }
                        }
                        catch (Exception imgEx)
                        {
                            errors.Add($"Image '{img.FileName}' : {imgEx.Message}");
                        }
                    }

                    // Construire le message de retour
                    string message = $"Traitement terminé pour le cas {caseId}: {successCount}/{images.Count} image(s) ajoutée(s) avec succès.";

                    if (errors.Any())
                    {
                        message += $" Erreurs: {string.Join("; ", errors)}";
                    }

                    // Si aucune image n'a été ajoutée, lever une exception
                    if (successCount == 0)
                    {
                        throw new Exception($"Aucune image n'a pu être ajoutée. Erreurs: {string.Join("; ", errors)}");
                    }

                    return message;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Erreur dans UpdateCaseImages: {ex}");
                throw new Exception($"Une erreur s'est produite lors de l'ajout des images : {ex.Message}", ex);
            }
        }

        public CaseDto GetCaseDetails(Guid caseId)
        {
            var request = System.Web.HttpContext.Current.Request;
            var userIdStr = request.Headers["Authorization"] ?? request.ServerVariables["HTTP_AUTHORIZATION"];

            if (string.IsNullOrEmpty(userIdStr) || !_redisDatabase.KeyExists($"sessions:{userIdStr}"))
                throw new HttpResponseException(HttpStatusCode.Unauthorized);

            if (!Guid.TryParse(userIdStr, out Guid currentUserId))
                throw new HttpResponseException(HttpStatusCode.Unauthorized);

            try
            {
                using (var service = _crmServiceProvider.GetService())
                {
                    if (service == null || !service.IsReady)
                        throw new Exception("La connexion à Dynamics 365 a échoué.");

                    // Vérifier que l'utilisateur est propriétaire du cas
                    var caseEntity = service.Retrieve("incident", caseId, new ColumnSet("ownerid"));
                    var ownerRef = caseEntity.GetAttributeValue<EntityReference>("ownerid");

                    if (ownerRef == null || ownerRef.Id != currentUserId)
                        throw new HttpResponseException(HttpStatusCode.Forbidden);

                    // Récupérer les détails complets du cas
                    var fullCaseEntity = service.Retrieve("incident", caseId, new ColumnSet(
                        "incidentid", "incidentstagecode", "ticketnumber", "title", "createdon", "casetypecode",
                        "activitiescomplete", "description", "ownerid", "prioritycode", "statuscode",
                        "caseorigincode", "customersatisfactioncode", "customerid", "modifiedon", "subjectid", "cr9bc_note", "cr9bc_cancellationreason" , "cr9bc_cancellationdate"
                    ));

                    // Récupération des données client
                    CustomerDto customerDto = null;
                    var customerRef = fullCaseEntity.GetAttributeValue<EntityReference>("customerid");
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

                    // Récupérer les images (annotations liées)
                    var images = new List<CaseImageDto>();
                    try
                    {
                        var notesQuery = new QueryExpression("annotation")
                        {
                            ColumnSet = new ColumnSet("documentbody", "mimetype", "filename"),
                            Criteria =
                    {
                        Conditions =
                        {
                            new ConditionExpression("objectid", ConditionOperator.Equal, caseId),
                            new ConditionExpression("mimetype", ConditionOperator.Like, "image/%")
                        }
                    }
                        };

                        var notes = service.RetrieveMultiple(notesQuery);
                        images = notes.Entities
                            .Select(n => new CaseImageDto
                            {
                                DocumentBody = n.GetAttributeValue<string>("documentbody"),
                                MimeType = n.GetAttributeValue<string>("mimetype"),
                                FileName = n.GetAttributeValue<string>("filename")
                            })
                            .Where(i => !string.IsNullOrEmpty(i.DocumentBody))
                            .ToList();
                    }
                    catch
                    {
                        images = new List<CaseImageDto>();
                    }

                    return new CaseDto
                    {
                        IncidentId = fullCaseEntity.Id,
                        Stage = fullCaseEntity.Contains("incidentstagecode") && fullCaseEntity.GetAttributeValue<OptionSetValue>("incidentstagecode") != null
                            ? CaseConversionHelper.ConvertCaseStageCode(fullCaseEntity.GetAttributeValue<OptionSetValue>("incidentstagecode").Value)
                            : null,
                        CaseNumber = fullCaseEntity.GetAttributeValue<string>("ticketnumber"),
                        Title = fullCaseEntity.GetAttributeValue<string>("title"),
                        Note = fullCaseEntity.GetAttributeValue<string>("cr9bc_note"),
                        CreatedOn = fullCaseEntity.GetAttributeValue<DateTime?>("createdon"),
                        ModifiedOn = fullCaseEntity.GetAttributeValue<DateTime?>("modifiedon"),
                        Subject = fullCaseEntity.GetAttributeValue<EntityReference>("subjectid")?.Name,
                        CaseType = fullCaseEntity.Contains("casetypecode") && fullCaseEntity.GetAttributeValue<OptionSetValue>("casetypecode") != null
                            ? CaseConversionHelper.ConvertCaseTypeCode(fullCaseEntity.GetAttributeValue<OptionSetValue>("casetypecode").Value)
                            : null,
                        ActivitiesComplete = fullCaseEntity.GetAttributeValue<bool?>("activitiescomplete"),
                        Description = fullCaseEntity.GetAttributeValue<string>("description"),
                        Owner = fullCaseEntity.GetAttributeValue<EntityReference>("ownerid")?.Name,
                        Priority = fullCaseEntity.Contains("prioritycode") && fullCaseEntity.GetAttributeValue<OptionSetValue>("prioritycode") != null
                            ? CaseConversionHelper.ConvertPriorityCode(fullCaseEntity.GetAttributeValue<OptionSetValue>("prioritycode").Value)
                            : null,
                        Status = fullCaseEntity.Contains("statuscode") && fullCaseEntity.GetAttributeValue<OptionSetValue>("statuscode") != null
                            ? CaseConversionHelper.ConvertStatusCode(fullCaseEntity.GetAttributeValue<OptionSetValue>("statuscode").Value)
                            : null,
                        Origin = fullCaseEntity.Contains("caseorigincode") && fullCaseEntity.GetAttributeValue<OptionSetValue>("caseorigincode") != null
                            ? CaseConversionHelper.ConvertOriginCode(fullCaseEntity.GetAttributeValue<OptionSetValue>("caseorigincode").Value)
                            : null,
                        Customer_satisfaction = fullCaseEntity.Contains("customersatisfactioncode") && fullCaseEntity.GetAttributeValue<OptionSetValue>("customersatisfactioncode") != null
                            ? CaseConversionHelper.ConvertCustomerSatisfaction(fullCaseEntity.GetAttributeValue<OptionSetValue>("customersatisfactioncode").Value)
                            : null,
                        Customer = customerDto,
                        Images = images,
                        CancellationReason = fullCaseEntity.GetAttributeValue<string>("cr9bc_cancellationreason"),
                        CancellationDate = fullCaseEntity.GetAttributeValue<DateTime?>("cr9bc_cancellationdate"),
                    };
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Une erreur s'est produite lors de la récupération des détails du cas {caseId}.", ex);
            }
        }


        public string DeleteCaseImage(Guid caseId, string fileName)
        {
            ValidateUserAndCaseOwnership(caseId);

            using (var service = _crmServiceProvider.GetService())
            {
                if (service == null || !service.IsReady)
                    throw new Exception("La connexion à Dynamics 365 a échoué.");

                // Find the annotation with the matching filename
                var query = new QueryExpression("annotation")
                {
                    ColumnSet = new ColumnSet("annotationid"),
                    Criteria = new FilterExpression
                    {
                        FilterOperator = LogicalOperator.And,
                        Conditions =
                {
                    new ConditionExpression("objectid", ConditionOperator.Equal, caseId),
                    new ConditionExpression("filename", ConditionOperator.Equal, fileName)
                }
                    }
                };

                var result = service.RetrieveMultiple(query);

                if (result.Entities.Count == 0)
                    throw new Exception($"Image '{fileName}' not found");

                // Delete the annotation
                service.Delete("annotation", result.Entities[0].Id);

                return $"Image '{fileName}' successfully deleted";
            }
        }


        public string UpdateCaseStageWithReason(Guid caseId, string newStage, string cancellationReason)
        {
            ValidateUserAndCaseOwnership(caseId);

            using (var service = _crmServiceProvider.GetService())
            {
                if (service == null || !service.IsReady)
                {
                    throw new Exception("La connexion à Dynamics 365 a échoué.");
                }

                // Convertir le stage texte en code Dynamics
                int stageCode = CaseConversionHelper.ConvertStageToCode(newStage);

                // Mettre à jour l'entité
                var entityToUpdate = new Entity("incident", caseId);
                entityToUpdate["incidentstagecode"] = new OptionSetValue(stageCode);

                // Ajouter la raison d'annulation et la date d'annulation si c'est une annulation
                if (!string.IsNullOrEmpty(cancellationReason))
                {
                    entityToUpdate["cr9bc_cancellationreason"] = cancellationReason;

                    // Ajouter la date d'annulation (date actuelle)
                    entityToUpdate["cr9bc_cancellationdate"] = DateTime.UtcNow;
                }

                service.Update(entityToUpdate);

                return $"Le stage de la case (incident: {caseId}) a été modifié à {newStage} (code: {stageCode}) avec raison d'annulation.";
            }
        }
    }
}




    
