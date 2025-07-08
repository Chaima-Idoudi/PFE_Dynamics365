import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ChatService } from '../chat.service';
import { AuthService } from '../../login/services/auth.service';
import { Subscription, Subject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AvatarComponent } from '../../Avatar/avatar/avatar.component';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

interface ChatMessage {
  id: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  timestamp: Date;
  isMe: boolean;
  isRead: boolean;
  status?: 'sending' | 'sent' | 'failed';
  hasAttachment?: boolean;
  attachmentType?: string;
  attachmentName?: string;
  attachmentUrl?: string;
  attachmentSize?: number;
}

interface ChatContact {
  userId: string;
  fullName: string;
  photo: string;
  isConnected: boolean;
  unreadCount: number;
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, AvatarComponent, FontAwesomeModule]
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  icons = {
    spinner: faSpinner
  };
  contacts: ChatContact[] = [];
  selectedContact: ChatContact | null = null;
  messages: ChatMessage[] = [];
  newMessage = '';
  isLoading = false;
  searchTerm = '';
  unreadCount = 0;
  isTyping = false;
  shouldScrollToBottom = false;
  typingUsers: { [userId: string]: boolean } = {};
  isEmptyConversation = false;

  // New properties for file handling
  selectedFile: File | null = null;
  selectedFilePreview: SafeUrl | null = null;
  previewImage: ChatMessage | null = null;
  maxFileSize = 10 * 1024 * 1024; // 10MB max file size

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private subscriptions: Subscription[] = [];
  private typingSubject = new Subject<string>();
  private typingTimeout: any = null;

  constructor(
    private chatService: ChatService,
    public authService: AuthService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    console.log('🚀 Initializing Chat Component...');
    this.chatService.initializeConnection();

    this.subscriptions.push(
      this.chatService.message$.subscribe({
        next: msg => this.handleIncomingMessage(msg.fromUserId, msg.message),
        error: err => console.error('❌ Error in message subscription:', err)
      }),

      this.chatService.contacts$.subscribe({
        next: contacts => {
          console.log('📋 Contacts loaded:', contacts?.length || 0);
          
          // Obtenir une copie des contacts
          let updatedContacts = [...contacts];
          
          // Ajouter l'utilisateur actuel à la liste d'affichage
          const currentUserId = this.authService.getUserId();
          if (currentUserId) {
            // Vérifier si l'utilisateur actuel est déjà dans la liste
            const selfContactExists = updatedContacts.some(c => c.userId === currentUserId);
            
            if (!selfContactExists) {
              // Trouver les informations de l'utilisateur actuel
              const currentUserName = this.authService.getFullName() || 'Vous';
              
              // Ajouter l'utilisateur actuel à la liste d'affichage (pas à la base de données)
              updatedContacts.push({
                userId: currentUserId,
                fullName: `${currentUserName} (vous)`,
                photo: '',
                isConnected: true,
                unreadCount: 0,
                email: '',
                isTechnician: false,
                isAdmin: false
              });
            } else {
              // Modifier le nom pour ajouter "(vous)"
              updatedContacts = updatedContacts.map(contact => {
                if (contact.userId === currentUserId && !contact.fullName.includes('(vous)')) {
                  return {
                    ...contact,
                    fullName: `${contact.fullName} (vous)`
                  };
                }
                return contact;
              });
            }
          }
          
          this.contacts = updatedContacts;
        },
        error: err => console.error('❌ Error in contacts subscription:', err)
      }),

      this.chatService.unreadCount$.subscribe({
        next: count => {
          console.log('📬 Unread count updated:', count);
          this.unreadCount = count || 0;
        },
        error: err => console.error('❌ Error in unread count subscription:', err)
      })
    );

    // Setup typing indicator with debounce
    this.subscriptions.push(
      this.typingSubject.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe(message => {
        if (this.selectedContact) {
          const isTyping = message.trim().length > 0;
          this.chatService.sendTypingStatus(this.selectedContact.userId, isTyping);
        }
      })
    );

    // Subscribe to typing status updates
    this.subscriptions.push(
      this.chatService.typingStatus$.subscribe({
        next: ({ userId, isTyping }) => {
          if (userId) {
            if (isTyping) {
              this.typingUsers[userId] = true;
            } else {
              delete this.typingUsers[userId];
            }
          }
        },
        error: err => console.error('❌ Error in typing status subscription:', err)
      })
    );

    this.subscriptions.push(
  this.chatService.message$.subscribe({
    next: (msg: any) => {
      // Special handling for file messages (complete objects)
      if (typeof msg === 'object' && 'hasAttachment' in msg) {
        this.handleFileMessage(msg);
      } else if (typeof msg === 'object' && 'fromUserId' in msg && 'message' in msg) {
        // Regular text messages
        this.handleIncomingMessage(msg.fromUserId, msg.message);
      } else {
        console.warn('Received message in unexpected format:', msg);
      }
    },
    error: err => console.error('❌ Error in message subscription:', err)
  })
);
    
  }
  


  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private handleIncomingMessage(fromUserId: string, message: any): void {
  if (!fromUserId) return;
  
  // Ignorer complètement les messages fichiers (ils seront gérés par handleFileMessage)
  if (typeof message === 'object' && 'hasAttachment' in message) {
    return;
  }
  
  console.log('📨 Message texte reçu de:', fromUserId, 'Contenu:', message);

  const currentUserId = this.authService.getUserId();
  const isCurrentChat = this.selectedContact?.userId === fromUserId;
  
  // Vérifier si c'est un message envoyé à soi-même
  const isSelfChat = fromUserId === currentUserId && this.selectedContact?.userId === currentUserId;
  
  if (isSelfChat) {
    console.log('💬 Message à soi-même ignoré pour éviter les doublons');
    return;
  }

  const newMessage: ChatMessage = {
    id: Date.now().toString(), // ID temporaire en attendant l'ID du serveur
    fromUserId,
    toUserId: currentUserId || '',
    message: typeof message === 'string' ? message : JSON.stringify(message),
    timestamp: new Date(),
    isMe: false,
    isRead: isCurrentChat
  };

  // Vérifier si le message existe déjà
  const messageExists = this.messages.some(m => 
    m.fromUserId === newMessage.fromUserId && 
    m.message === newMessage.message && 
    Math.abs(m.timestamp.getTime() - newMessage.timestamp.getTime()) < 1000
  );

  if (!messageExists) {
    this.messages = [...this.messages, newMessage];
    console.log('💬 Message texte ajouté, total:', this.messages.length);
    this.shouldScrollToBottom = true;

    if (isCurrentChat) {
      this.markMessagesAsRead([newMessage.id]);
    } else {
      this.updateContactUnreadCount(fromUserId);
    }
  }
}

private handleFileMessage(message: any): void {
  console.log('📁 Processing file message:', message);
  
  const currentUserId = this.authService.getUserId();
  if (!currentUserId) return;

  // Determine if this is a sent or received message
  const isMe = message.fromUserId === currentUserId;
  
  // Create complete message object
  const completeMessage: ChatMessage = {
    id: message.messageId || message.id,
    fromUserId: message.fromUserId,
    toUserId: isMe ? message.toUserId : message.fromUserId,
    message: message.message || `File: ${message.fileName}`,
    timestamp: new Date(),
    isMe: isMe,
    isRead: isMe, // Sent messages are automatically read
    status: 'sent',
    hasAttachment: true,
    attachmentType: message.fileType || message.attachmentType,
    attachmentName: message.fileName || message.attachmentName,
    attachmentSize: message.fileSize || message.attachmentSize,
    attachmentUrl: message.fileUrl || message.attachmentUrl || this.chatService.getFileUrl(message.messageId || message.id)
  };

  // Check if message already exists
  const existingIndex = this.messages.findIndex(m => m.id === completeMessage.id);
  
  if (existingIndex >= 0) {
    // Update existing message
    this.messages[existingIndex] = completeMessage;
  } else {
    // Add new message
    this.messages = [...this.messages, completeMessage];
  }

  this.shouldScrollToBottom = true;
  
  // Mark as read if this is the active conversation and message is received
  if (!isMe && this.selectedContact?.userId === completeMessage.fromUserId) {
    this.markMessagesAsRead([completeMessage.id]);
  } else if (!isMe) {
    this.updateContactUnreadCount(completeMessage.fromUserId);
  }
}

private handleIncomingFileMessage(message: ChatMessage): void {
  console.log('📁 File message received:', message);
  
  const currentUserId = this.authService.getUserId();
  const isCurrentChat = this.selectedContact?.userId === message.fromUserId;
  
  // Complete the message object if needed
  const completeMessage: ChatMessage = {
    ...message,
    timestamp: message.timestamp || new Date(),
    isMe: message.fromUserId === currentUserId,
    isRead: isCurrentChat && message.fromUserId !== currentUserId,
    status: message.status || 'sent'
  };
  
  // If the message has an ID but no URL, add the URL
  if (completeMessage.id && !completeMessage.id.startsWith('temp-') && !completeMessage.attachmentUrl) {
    completeMessage.attachmentUrl = this.chatService.getFileUrl(completeMessage.id);
  }
  
  // Replace any temporary message with the same file name
  const tempIndex = this.messages.findIndex(m => 
    m.id.startsWith('temp-') && 
    m.attachmentName === completeMessage.attachmentName &&
    ((m.isMe && m.fromUserId === completeMessage.fromUserId) || 
     (!m.isMe && m.toUserId === completeMessage.fromUserId))
  );
  
  if (tempIndex >= 0) {
    // Replace the temporary message
    console.log('🔄 Replacing temporary message with final version');
    this.messages[tempIndex] = completeMessage;
    this.messages = [...this.messages];
  } else {
    // Check if this message already exists (to avoid duplicates)
    const existingIndex = this.messages.findIndex(m => 
      m.id === completeMessage.id && !m.id.startsWith('temp-')
    );
    
    if (existingIndex >= 0) {
      console.log('⚠️ Message already exists, updating');
      this.messages[existingIndex] = {
        ...this.messages[existingIndex],
        ...completeMessage
      };
      this.messages = [...this.messages];
    } else {
      // Add as a new message
      console.log('➕ Adding new file message');
      this.messages = [...this.messages, completeMessage];
    }
  }
  
  this.shouldScrollToBottom = true;
  
  // Mark as read if it's the current conversation and not from the current user
  if (isCurrentChat && !completeMessage.isMe && !completeMessage.isRead) {
    this.markMessagesAsRead([completeMessage.id]);
  } else if (!isCurrentChat && !completeMessage.isMe) {
    this.updateContactUnreadCount(completeMessage.fromUserId);
  }
}

  selectContact(contact: ChatContact): void {
    if (!contact?.userId) return;

    console.log('👤 Selecting contact:', contact.fullName);
    this.selectedContact = contact;
    this.loadChatHistory();
    this.resetContactUnreadCount(contact.userId);
    
    // Clear any selected file when changing contacts
    this.clearSelectedFile();
  }

  private resetContactUnreadCount(userId: string): void {
    const contact = this.contacts.find(c => c.userId === userId);
    if (contact) {
      contact.unreadCount = 0;
    }
  }

  loadChatHistory(): void {
  if (!this.selectedContact) return;

  const currentUserId = this.authService.getUserId();
  if (!currentUserId) return;

  console.log('📚 Loading chat history for:', this.selectedContact.fullName);
  this.isLoading = true;
  this.messages = [];
  
  this.chatService.getChatHistory(currentUserId, this.selectedContact.userId)
    .subscribe({
      next: (messages) => {
        console.log('📚 Chat history loaded:', messages.length, 'messages');
        this.isEmptyConversation = messages.length === 0;
        
        // Log attachment messages for debugging
        const attachmentMessages = messages.filter(m => m.hasAttachment);
        if (attachmentMessages.length > 0) {
          console.log(`Found ${attachmentMessages.length} messages with attachments:`, 
            attachmentMessages.map(m => ({
              id: m.id,
              type: m.attachmentType,
              name: m.attachmentName
            }))
          );
        }
        
        // Pour le chat avec soi-même, s'assurer que tous les messages sont marqués comme "isMe"
        if (this.selectedContact?.userId === currentUserId) {
          this.messages = messages.map(msg => ({
            ...msg,
            isMe: true,
            isRead: true
          }));
        } else {
          this.messages = messages.map(msg => ({
            ...msg,
            isMe: msg.fromUserId === currentUserId,
            isRead: msg.fromUserId === currentUserId ? true : msg.isRead
          }));
        }
        
        this.isLoading = false;
        this.shouldScrollToBottom = true;
        
        const unreadIds = this.messages
          .filter(msg => !msg.isMe && !msg.isRead)
          .map(msg => msg.id);
        
        if (unreadIds.length > 0) {
          console.log('📬 Marking', unreadIds.length, 'messages as read');
          this.markMessagesAsRead(unreadIds);
        }
      },
      error: (err) => {
        console.error('❌ Error loading chat history', err);
        this.isLoading = false;
        this.isEmptyConversation = true;
      }
    });
}
  async sendMessage(): Promise<void> {
  if ((!this.newMessage.trim() && !this.selectedFile) || !this.selectedContact) return;

  const currentUserId = this.authService.getUserId();
  if (!currentUserId) return;

  // Clear typing status when sending a message
  if (this.selectedContact) {
    this.chatService.sendTypingStatus(this.selectedContact.userId, false);
  }
  
  // Handle file attachment if present
  if (this.selectedFile) {
    await this.sendFileMessage();
    return;
  }
  
  // Handle text-only message
  const messageText = this.newMessage.trim();
  console.log('📤 Sending text message:', messageText.substring(0, 50) + '...');
  
  // Clear the input immediately for better UX
  this.newMessage = '';
  
  // Add temporary message to UI (only for text messages)
  const tempId = 'temp-' + Date.now().toString();
  const tempMessage: ChatMessage = {
    id: tempId,
    fromUserId: currentUserId,
    toUserId: this.selectedContact.userId,
    message: messageText,
    timestamp: new Date(),
    isMe: true,
    isRead: false,
    status: 'sending'
  };
  
  this.messages = [...this.messages, tempMessage];
  this.shouldScrollToBottom = true;
  
  try {
    const success = await this.chatService.sendMessage(this.selectedContact.userId, messageText);
    
    if (success) {
      console.log('✅ Message sent successfully');
      const messageIndex = this.messages.findIndex(m => m.id === tempId);
      if (messageIndex >= 0) {
        this.messages[messageIndex].status = 'sent';
        
        if (this.selectedContact.userId === currentUserId) {
          this.messages[messageIndex].isRead = true;
        }
        
        this.messages = [...this.messages];
      }
    } else {
      throw new Error('Failed to send message: Server returned false');
    }
  } catch (err) {
    console.error('❌ Exception while sending message:', err);
    
    const messageIndex = this.messages.findIndex(m => m.id === tempId);
    if (messageIndex >= 0) {
      this.messages[messageIndex].status = 'failed';
      this.messages = [...this.messages];
    }
    
    alert('Failed to send message. Please try again.');
  }
}

 async sendFileMessage(): Promise<void> {
  if (!this.selectedFile || !this.selectedContact) return;

  const currentUserId = this.authService.getUserId();
  if (!currentUserId) return;

  const file = this.selectedFile;
  const fileType = this.determineFileType(file);
  const messageText = this.newMessage.trim();
  
  console.log(`📤 Sending file: ${file.name}, Size: ${file.size}`);
  
  try {
    const messageId = await this.chatService.sendFileMessage(
      this.selectedContact.userId, 
      file, 
      messageText
    );

    if (!messageId) {
      throw new Error('No message ID returned');
    }
    
    console.log(`✅ File sent successfully, ID: ${messageId}`);

    // Clear the input
    this.newMessage = '';
    
  } catch (error) {
    console.error('❌ File upload failed:', error);
    alert('Failed to upload file. Please try again.');
  } finally {
    this.clearSelectedFile();
  }
}

  retryMessage(messageId: string): void {
    const failedMessage = this.messages.find(m => m.id === messageId && m.status === 'failed');
    if (!failedMessage || !this.selectedContact) return;
    
    // Update status to sending
    const messageIndex = this.messages.findIndex(m => m.id === messageId);
    this.messages[messageIndex].status = 'sending';
    this.messages = [...this.messages];
    
    // Check if it's a file message
    if (failedMessage.hasAttachment) {
      // For file messages, we can't retry directly - need to ask user to reselect the file
      alert('Please reselect the file and try sending again.');
      this.messages[messageIndex].status = 'failed';
      this.messages = [...this.messages];
      return;
    }
    
    // Retry sending text message
    this.chatService.sendMessage(failedMessage.toUserId, failedMessage.message)
      .then(success => {
        if (success) {
          this.messages[messageIndex].status = 'sent';
        } else {
          this.messages[messageIndex].status = 'failed';
        }
        this.messages = [...this.messages];
      })
      .catch(() => {
        this.messages[messageIndex].status = 'failed';
        this.messages = [...this.messages];
      });
  }

  markMessagesAsRead(messageIds: string[]): void {
    if (!messageIds.length) return;

    console.log('📖 Marking messages as read:', messageIds.length);
    this.chatService.markMessagesAsRead(messageIds)
      .subscribe({
        next: () => {
          this.messages.forEach(msg => {
            if (messageIds.includes(msg.id)) {
              msg.isRead = true;
            }
          });
        },
        error: (err) => console.error('❌ Error marking messages as read', err)
      });
  }

  updateContactUnreadCount(userId: string): void {
    const contact = this.contacts.find(c => c.userId === userId);
    if (contact) {
      contact.unreadCount = (contact.unreadCount || 0) + 1;
    }
  }

  get filteredContacts(): ChatContact[] {
    let filtered = this.contacts;
    
    if (this.searchTerm) {
      filtered = this.contacts.filter(contact => 
        contact?.fullName?.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
    
    // Sort to ensure current user is always at the top
    return filtered.sort((a, b) => {
      const currentUserId = this.authService.getUserId();
      if (a.userId === currentUserId) return -1;
      if (b.userId === currentUserId) return 1;
      return 0;
    });
  }
  
  onTyping(): void {
    this.typingSubject.next(this.newMessage);
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    
    if (!this.isTyping && this.newMessage.trim()) {
      this.isTyping = true;
    }
    
    this.typingTimeout = setTimeout(() => {
      this.isTyping = false;
      if (this.selectedContact) {
        this.chatService.sendTypingStatus(this.selectedContact.userId, false);
      }
    }, 1000);
  }

  get isSelectedContactTyping(): boolean {
    return this.selectedContact ? !!this.typingUsers[this.selectedContact.userId] : false;
  }
  
  scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom', err);
    }
  }

  // File handling methods
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    
    const file = input.files[0];
    
    // Check file size
    if (file.size > this.maxFileSize) {
      alert(`File is too large. Maximum size is ${this.formatFileSize(this.maxFileSize)}.`);
      this.clearFileInput();
      return;
    }
    
    console.log('📎 File selected:', file.name, file.type, file.size);
    this.selectedFile = file;
    
    // Create preview for images
    if (this.isImageFile(file)) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedFilePreview = this.sanitizer.bypassSecurityTrustUrl(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      this.selectedFilePreview = null;
    }
  }
  
  clearSelectedFile(): void {
    this.selectedFile = null;
    this.selectedFilePreview = null;
    this.clearFileInput();
  }
  
  clearFileInput(): void {
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }
  
  isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }
  
  determineFileType(file: File): string {
  // Vérifier d'abord par le type MIME
  if (file.type.startsWith('image/')) {
    return "1"; // Option value pour Image
  } else if (
    file.type === 'application/pdf' || 
    file.type === 'application/msword' || 
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.type === 'text/plain'
  ) {
    return "2"; // Option value pour Document
  }
  
  // Si le type MIME n'est pas concluant, vérifier l'extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension) {
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension)) {
      return "1"; // Option value pour Image
    } else if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) {
      return "2"; // Option value pour Document
    }
  }
  
  // Par défaut, retourner Other
  return "3"; // Option value pour Other
}
  
  formatFileSize(bytes: number | undefined): string {
  if (bytes === undefined || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
  
  getAttachmentUrl(message: ChatMessage): string {
  // Ne pas essayer d'obtenir l'URL pour les messages temporaires
  if (!message || !message.id || message.id.startsWith('temp-')) {
    return '';
  }
  

  
  return this.chatService.getFileUrl(message.id);
}
  
  openImagePreview(message: ChatMessage): void {
    this.previewImage = message;
  }
  
  closeImagePreview(): void {
    this.previewImage = null;
  }
  
  onImageLoaded(): void {
    this.shouldScrollToBottom = true;
  }
  
  onImageError(message: ChatMessage): void {
    console.error('❌ Failed to load image for message:', message.id);
  }

  ngOnDestroy(): void {
    console.log('🔌 Destroying Chat Component...');
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    
    this.chatService.disconnect();
  }

  private updateMessageStatus(messageId: string, newStatus: 'sending' | 'sent' | 'failed'): void {
  const index = this.messages.findIndex(m => m.id === messageId);
  if (index >= 0) {
    this.messages[index].status = newStatus;
    this.messages = [...this.messages];
  }
}
}