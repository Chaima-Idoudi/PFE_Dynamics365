using ConnectDynamics_with_framework.Models.DTOs;
using ConnectDynamics_with_framework.Services.Interfaces;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net;
using System.Threading.Tasks;
using System.Web.Http;
using System.Web.Http.Cors;
using System.Net.Http.Headers;
using System.IO;
using ConnectDynamics_with_framework.Hubs;
using Microsoft.AspNet.SignalR;

namespace ConnectDynamics_with_framework.Controllers
{
    [EnableCors(origins: "http://localhost:4200", headers: "*", methods: "*")]
    [RoutePrefix("api/chat")]
    public class ChatController : ApiController
    {
        private readonly IChatService _chatService;

        public ChatController(IChatService chatService)
        {
            _chatService = chatService;
        }

        [HttpPost]
        [Route("messages")]
        public async Task<IHttpActionResult> AddMessage([FromBody] ChatMessageDto messageDto)
        {
            try
            {
                var messageId = await _chatService.AddChatMessage(messageDto);
                return Ok(messageId);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        [HttpGet]
        [Route("messages/{userId1}/{userId2}")]
        public async Task<IHttpActionResult> GetMessages(Guid userId1, Guid userId2)
        {
            try
            {
                var messages = await _chatService.GetMessagesBetweenUsers(userId1, userId2);

                // Log pour vérifier les IDs des messages
                foreach (var msg in messages)
                {
                    System.Diagnostics.Debug.WriteLine($"API returning message: ID={msg.Id}, HasAttachment={msg.HasAttachment}, AttachmentName={msg.AttachmentName}");
                }

                return Ok(messages);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        [HttpPatch]
        [Route("messages/read")]
        public async Task<IHttpActionResult> MarkMessagesAsRead([FromBody] List<Guid> messageIds)
        {
            try
            {
                await _chatService.MarkMessagesAsRead(messageIds);
                return Ok();
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        [HttpGet]
        [Route("unread/{userId}")]
        public async Task<IHttpActionResult> GetUnreadMessages(Guid userId)
        {
            try
            {
                var unreadMessages = await _chatService.GetUnreadMessages(userId);
                return Ok(unreadMessages);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        [HttpGet]
        [Route("contacts/{userId}")]
        public async Task<IHttpActionResult> GetChatContacts(Guid userId)
        {
            try
            {
                var contacts = await _chatService.GetChatContacts(userId);
                return Ok(contacts);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        [HttpGet]
        [Route("verify/{messageId}")]
        public async Task<IHttpActionResult> VerifyMessage(Guid messageId)
        {
            try
            {
                var exists = await _chatService.VerifyMessageExists(messageId);
                return Ok(exists);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        
        [HttpPost]
        [Route("messages/attachment")]
        public async Task<IHttpActionResult> AddMessageWithAttachment()
        {
            try
            {
                if (!Request.Content.IsMimeMultipartContent())
                {
                    return BadRequest("Unsupported media type");
                }

                var provider = new MultipartMemoryStreamProvider();
                await Request.Content.ReadAsMultipartAsync(provider);

                // Extract message data
                string messageJson = null;
                foreach (var content in provider.Contents)
                {
                    if (content.Headers.ContentDisposition?.Name != null &&
                        content.Headers.ContentDisposition.Name.Trim('"') == "message")
                    {
                        messageJson = await content.ReadAsStringAsync();
                        break;
                    }
                }

                if (string.IsNullOrEmpty(messageJson))
                {
                    return BadRequest("Message data is required");
                }

                ChatMessageDto messageDto = JsonConvert.DeserializeObject<ChatMessageDto>(messageJson);

                // Extract file data
                HttpContent fileContent = null;
                foreach (var content in provider.Contents)
                {
                    if (content.Headers.ContentDisposition?.Name != null &&
                        content.Headers.ContentDisposition.Name.Trim('"') == "file" &&
                        content.Headers.ContentDisposition.FileName != null)
                    {
                        fileContent = content;
                        break;
                    }
                }

                if (fileContent == null)
                {
                    return BadRequest("File attachment is required");
                }

                byte[] fileData = await fileContent.ReadAsByteArrayAsync();
                string fileName = fileContent.Headers.ContentDisposition.FileName.Trim('"');

                // Update message properties
                messageDto.HasAttachment = true;
                messageDto.AttachmentName = fileName;
                messageDto.AttachmentSize = fileData.Length;
                messageDto.AttachmentType = DetermineFileType(fileName);

                // Save message with attachment
                var messageId = await _chatService.AddChatMessageWithAttachment(messageDto, fileData);

                // Récupérer les détails du message complet (pour SignalR)
                var completeMessage = await _chatService.GetMessageById(messageId);

                // Notifier le destinataire via SignalR en temps réel
                var hubContext = GlobalHost.ConnectionManager.GetHubContext<ChatHub>();
                if (hubContext != null && completeMessage != null)
                {
                    // Récupérer la connectionId du destinataire
                    if (ChatHub.UserConnections.TryGetValue(completeMessage.ToUserId, out var recipientConnectionId))
                    {
                        hubContext.Clients.Client(recipientConnectionId).receiveFileMessage(
                            completeMessage.FromUserId.ToString(),
                            completeMessage.Message,
                            completeMessage.AttachmentName,
                            completeMessage.AttachmentType,
                            completeMessage.AttachmentSize,
                            completeMessage.Id.ToString(),
                            completeMessage.AttachmentUrl
                        );
                    }
                }
                if (ChatHub.UserConnections.TryGetValue(completeMessage.FromUserId, out var senderConnectionId))
                {
                    hubContext.Clients.Client(senderConnectionId).receiveFileMessage(
                        completeMessage.FromUserId.ToString(),
                        completeMessage.Message,
                        completeMessage.AttachmentName,
                        completeMessage.AttachmentType,
                        completeMessage.AttachmentSize,
                        completeMessage.Id.ToString(),
                        completeMessage.AttachmentUrl
                    );
                }
                return Ok(new
                {
                    messageId = messageId.ToString(),
                    fileUrl = $"{Request.RequestUri.GetLeftPart(UriPartial.Authority)}/api/chat/attachment/{messageId}",
                    fileName = messageDto.AttachmentName,
                    fileType = messageDto.AttachmentType,
                    fileSize = messageDto.AttachmentSize,
                    message = messageDto.Message
                });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error in AddMessageWithAttachment: {ex.Message}");
                return InternalServerError(ex);
            }
        }
        private string DetermineFileType(string fileName)
        {
            string extension = Path.GetExtension(fileName).ToLowerInvariant();

            if (new[] { ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg" }.Contains(extension))
                return "1"; // Image
            else if (new[] { ".doc", ".docx", ".pdf", ".txt", ".rtf", ".xls", ".xlsx", ".ppt", ".pptx" }.Contains(extension))
                return "2"; // Document
            else
                return "3"; // Other
        }

        [HttpGet]
        [Route("attachment/{messageId}")]
        public async Task<HttpResponseMessage> GetAttachment(Guid messageId)
        {
            try
            {
                System.Diagnostics.Debug.WriteLine($"GetAttachment called with messageId: {messageId}");

                // Vérifiez que l'ID est valide
                if (messageId == Guid.Empty)
                {
                    System.Diagnostics.Debug.WriteLine("Invalid message ID (empty GUID)");
                    return Request.CreateErrorResponse(HttpStatusCode.BadRequest, "Invalid message ID");
                }

                // Obtenez les détails du message
                var message = await _chatService.GetMessageById(messageId);
                if (message == null)
                {
                    System.Diagnostics.Debug.WriteLine($"Message not found for ID: {messageId}");
                    return Request.CreateResponse(HttpStatusCode.NotFound);
                }

                System.Diagnostics.Debug.WriteLine($"Found message: HasAttachment={message.HasAttachment}, AttachmentName={message.AttachmentName}");

                // Obtenez les données du fichier
                byte[] fileData = await _chatService.GetAttachmentData(messageId);
                if (fileData == null || fileData.Length == 0)
                {
                    System.Diagnostics.Debug.WriteLine("Attachment data not found or empty");
                    return Request.CreateResponse(HttpStatusCode.NotFound);
                }

                System.Diagnostics.Debug.WriteLine($"Retrieved attachment data: {fileData.Length} bytes");

                // Créez la réponse avec le fichier
                var response = new HttpResponseMessage(HttpStatusCode.OK);
                response.Content = new ByteArrayContent(fileData);
                response.Content.Headers.ContentType = new MediaTypeHeaderValue(GetMimeType(message.AttachmentName));
                response.Content.Headers.ContentDisposition = new ContentDispositionHeaderValue("attachment")
                {
                    FileName = message.AttachmentName
                };

                System.Diagnostics.Debug.WriteLine($"Returning file: {message.AttachmentName}, Type: {GetMimeType(message.AttachmentName)}");
                return response;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error in GetAttachment: {ex.Message}");
                return Request.CreateErrorResponse(HttpStatusCode.InternalServerError, ex);
            }
        }
       

        private string GetMimeType(string fileName)
        {
            string extension = Path.GetExtension(fileName).ToLowerInvariant();
            switch (extension)
            {
                case ".jpg":
                case ".jpeg":
                    return "image/jpeg";
                case ".png":
                    return "image/png";
                case ".gif":
                    return "image/gif";
                case ".pdf":
                    return "application/pdf";
                case ".doc":
                    return "application/msword";
                case ".docx":
                    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                case ".xls":
                    return "application/vnd.ms-excel";
                case ".xlsx":
                    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                case ".txt":
                    return "text/plain";
                default:
                    return "application/octet-stream";
            }
        }
        [HttpPost]
        [Route("test-upload")]
        public async Task<IHttpActionResult> TestFileUpload()
        {
            try
            {
                if (!Request.Content.IsMimeMultipartContent())
                {
                    return BadRequest("Unsupported media type");
                }

                var provider = new MultipartMemoryStreamProvider();
                await Request.Content.ReadAsMultipartAsync(provider);

                var result = new List<object>();
                foreach (var content in provider.Contents)
                {
                    var name = content.Headers.ContentDisposition?.Name?.Trim('"');
                    var fileName = content.Headers.ContentDisposition?.FileName?.Trim('"');
                    var contentType = content.Headers.ContentType?.MediaType;
                    var length = (await content.ReadAsByteArrayAsync()).Length;

                    result.Add(new
                    {
                        Name = name,
                        FileName = fileName,
                        ContentType = contentType,
                        Length = length
                    });
                }

                return Ok(new
                {
                    Message = "Upload received successfully",
                    Parts = result
                });
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception("Test upload failed", ex));
            }
        }

        [HttpGet]
        [Route("messages/{messageId}")]
        public async Task<IHttpActionResult> GetMessageById(Guid messageId)
        {
            try
            {
                if (messageId == Guid.Empty)
                {
                    return BadRequest("Invalid message ID");
                }

                var message = await _chatService.GetMessageById(messageId);

                if (message == null)
                {
                    return NotFound();
                }

                return Ok(message);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error retrieving message: {ex.Message}");
                return InternalServerError(ex);
            }
        }

    }
}