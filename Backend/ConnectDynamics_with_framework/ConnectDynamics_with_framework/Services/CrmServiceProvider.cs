using Microsoft.Xrm.Tooling.Connector;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Web;
using System.Diagnostics;

//La classe CrmServiceProvider a deux responsabilités principales:

//    Récupérer la chaîne de connexion depuis la configuration

//    Établir une connexion avec Dynamics 365 et retourner un client de service

namespace ConnectDynamics_with_framework.Services
{
	public class CrmServiceProvider
	{
        private readonly string _connectionString;

        public CrmServiceProvider()
        {
            try
            {
                // On récupère la chaîne de connexion nommée "Dynamics365"
                _connectionString = ConfigurationManager.ConnectionStrings["Dynamics365"]?.ConnectionString;

                // Vérifie si la chaîne de connexion est vide ou manquante
                if (string.IsNullOrWhiteSpace(_connectionString))
                {
                    // Log d'erreur dans le système de traces
                    Trace.TraceError("La chaîne de connexion 'Dynamics365' est introuvable ou vide.");

                    // Lève une erreur pour arrêter le programme proprement
                    throw new ConfigurationErrorsException("Chaîne de connexion Dynamics365 manquante.");
                }
            }
            catch (Exception ex)
            {
                // Log de l'erreur lors de la lecture de la configuration
                Trace.TraceError("Erreur lors du chargement de la chaîne de connexion : " + ex.Message);
                throw;
            }

        }

        public CrmServiceClient GetService()
        {
            try
            {
                // Crée une instance du service avec la chaîne de connexion
                var serviceClient = new CrmServiceClient(_connectionString);

                // Vérifie si la connexion a réussi
                if (!serviceClient.IsReady)
                {
                    // Enregistre le message d’erreur spécifique à CRM
                    Trace.TraceError("Échec de la connexion à Dynamics 365 : " + serviceClient.LastCrmError);
                    return null;
                }

                // Log de succès
                Trace.TraceInformation("Connexion à Dynamics 365 réussie.");
                return serviceClient;
            }
            catch (Exception ex)
            {
                // Capture toute autre erreur inattendue
                Trace.TraceError("Erreur lors de la connexion à Dynamics 365 : " + ex.Message);
                return null;
            }
        }
    }
    }


