using Microsoft.AspNet.SignalR;
using Microsoft.Owin;
using Microsoft.Owin.Cors;
using Owin;
using System.Web.Http;
using System.Web.Cors;
using ConnectDynamics_with_framework.App_Start; // Assurez-vous d'ajouter cette référence
using ConnectDynamics_with_framework.Hubs;
using StackExchange.Redis;
using ConnectDynamics_with_framework.Services.Interfaces;
using Unity;

[assembly: OwinStartup(typeof(ConnectDynamics_with_framework.Startup))]
namespace ConnectDynamics_with_framework
{
    public class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            // Configurer Unity pour SignalR
            GlobalHost.DependencyResolver.Register(
                typeof(ChatHub),
                () => new ChatHub(
                    UnityConfig.GetConfiguredContainer().Resolve<IDatabase>(),
                    UnityConfig.GetConfiguredContainer().Resolve<IChatService>()
                )
            );

            app.Map("/signalr", map =>
            {
                // Create a custom CORS policy that includes credentials
                var corsPolicy = new CorsPolicy
                {
                    AllowAnyMethod = true,
                    AllowAnyHeader = true,
                    SupportsCredentials = true
                };
                corsPolicy.Origins.Add("http://localhost:4200"); // Angular dev server
                corsPolicy.Origins.Add("https://localhost:4200"); // Secure Angular dev server
                corsPolicy.Origins.Add("ws://localhost:4200"); // WebSocket
                corsPolicy.Origins.Add("wss://localhost:4200"); // Secure WebSocket

                map.UseCors(new CorsOptions
                {
                    PolicyProvider = new CorsPolicyProvider
                    {
                        PolicyResolver = context => System.Threading.Tasks.Task.FromResult(corsPolicy)
                    }
                });

                var hubConfiguration = new HubConfiguration
                {
                    EnableDetailedErrors = true,
                    EnableJavaScriptProxies = true
                };
                map.RunSignalR(hubConfiguration);
            });

            // Configurer Web API
            //GlobalConfiguration.Configure(WebApiConfig.Register);
        }
    }
}
