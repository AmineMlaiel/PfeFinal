import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { BookingService } from '../../services/booking.service';
import { AuthService } from '../../auth/auth.service';
import { DomSanitizer } from '@angular/platform-browser';
import { finalize } from 'rxjs/operators';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

enum DemandStatus {
  PENDING = 'En attente',
  ACCEPTED = 'Acceptée',
  REJECTED = 'Refusée'
}

interface User {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  FirstName?: string;
  LastName?: string;
  profileImage?: string;
}

interface booking {
  _id: string;
  statut: DemandStatus;
  status?: string;
  expanded?: boolean;
  property?: {
    title: string;
    price: number;
    images?: string[];
  };
  contactInfo?: {
    name: string;
    email: string;
    phone: string;
  };
  conversation?: Array<{
    message: string;
    sender: User;
    createdAt: Date;
  }>;
  createdAt?: Date;
}
interface RawMessage {
  _id: string;
  message: string;
  sender: {
    _id: string;
    name: string;
  };
  attachments?: any[];
  createdAt: string;
}


@Component({
  selector: 'app-demands',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatExpansionModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule
  ],
  templateUrl: './demands.component.html',
  styleUrls: ['./demands.component.scss']
})
export class DemandsComponent implements OnInit {
  demands: booking[] = [];
    currentUserId: string = '';
  filteredDemands: booking[] = [];
  message: string = '';
  isLoadingMessages: { [demandId: string]: boolean } = {};
  ownerName: string = '';
  todayDate: string = '';
  isLoading: boolean = false;
  isSending: boolean = false;
  statusFilter: string = 'all';
  searchTerm: string = '';
  private messageDebounceTimer: any;

  constructor(
    private bookingService: BookingService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private sanitizer: DomSanitizer
  ) { }

  private getSafeUser(): User | null {
    try {
      return this.authService['currentUserSubject'].value || null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  ngOnInit(): void {
    const user = this.getSafeUser();
    if (user) {
      this.ownerName = [
        user.firstName || user.FirstName,
        user.lastName || user.LastName
      ].filter(Boolean).join(' ') || 'Propriétaire';
      this.currentUserId = user._id || user.id || '';
      this.todayDate = new Date().toLocaleDateString();
      this.loadDemands();
    } else {
      this.showError('Utilisateur non connecté');
    }
  }

  private async loadBookingsAsync(obs: any, transformFn: (data: any) => booking[]): Promise<void> {
    this.isLoading = true;
    try {
      const response = await obs.toPromise();
      const data = response?.data ?? response ?? [];
      this.demands = Array.isArray(data) ? transformFn(data) : [];
      this.filterDemands();
    } catch (error) {
      this.handleError(error, 'Échec du chargement des données');
    } finally {
      this.isLoading = false;
    }
  }

  private filterDemands(): void {
    this.filteredDemands = this.demands.filter(demand => {
      const matchesStatus = this.statusFilter === 'all' || 
        (this.statusFilter === 'pending' && demand.statut === DemandStatus.PENDING) ||
        (this.statusFilter === 'accepted' && demand.statut === DemandStatus.ACCEPTED) ||
        (this.statusFilter === 'rejected' && demand.statut === DemandStatus.REJECTED);
      
      const matchesSearch = !this.searchTerm || 
        demand.property?.title?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        demand.contactInfo?.name?.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      return matchesStatus && matchesSearch;
    });
  }

  async loadDemands(): Promise<void> {
    const user = this.getSafeUser();
    const userId = user?._id || user?.id;
    if (!userId) {
      this.showError('ID utilisateur non disponible');
      return;
    }

    await this.loadBookingsAsync(
      this.bookingService.getOwnerBookings(),
      (data) => data.map(this.transformDemand.bind(this))
    );
  }

  private transformDemand(demand: any): booking {
    return {
      ...demand,
      expanded: false,
      statut: this.mapStatus(demand.status || demand.statut),
      createdAt: new Date(demand.createdAt || Date.now())
    };
  }

  private mapStatus(status: string): DemandStatus {
    if (!status) return DemandStatus.PENDING;
    
    const statusMap: Record<string, DemandStatus> = {
      'pending': DemandStatus.PENDING,
      'confirmed': DemandStatus.ACCEPTED,
      'cancelled': DemandStatus.REJECTED
    };
    
    return statusMap[status.toLowerCase()] || DemandStatus.PENDING;
  }

  async acceptDemand(demandId: string, index: number): Promise<void> {
    try {
      await this.bookingService.updateBookingStatus(demandId, 'confirmed').toPromise();
      this.demands[index].statut = DemandStatus.ACCEPTED;
      this.filterDemands();
      this.showSuccess('Demande acceptée avec succès');
    } catch (error) {
      this.handleError(error, 'Échec de l\'acceptation de la demande');
    }
  }

  async refuseDemand(demandId: string, index: number): Promise<void> {
    try {
      await this.bookingService.updateBookingStatus(demandId, 'cancelled').toPromise();
      this.demands[index].statut = DemandStatus.REJECTED;
      this.filterDemands();
      this.showSuccess('Demande refusée avec succès');
    } catch (error) {
      this.handleError(error, 'Échec du refus de la demande');
    }
  }

  // Add this method to your DemandsComponent
async getMessages(demand: booking): Promise<void> {
    if (!demand._id) return;
    
    try {
      // Set loading state for this specific demand
      this.isLoadingMessages[demand._id] = true;
      
      const response = await this.bookingService.getMessages(demand._id).toPromise();

if (response?.success && response.data?.messages) {
  demand.conversation = (response.data.messages as RawMessage[]).map((message) => ({
    _id: message._id,
    message: message.message,
    sender: {
      _id: message.sender._id,
      firstName: message.sender.name.split(' ')[0],
      lastName: message.sender.name.split(' ')[1] || '',
      profileImage: ''
    },
    attachments: message.attachments || [],
    createdAt: new Date(message.createdAt)
  }));
}

    } catch (error) {
      this.handleError(error, 'Failed to load messages');
    } finally {
      // Clear loading state for this demand
      this.isLoadingMessages[demand._id] = false;
    }
  }


// Update your sendMessage method to handle the response format
async sendMessage(demand: booking, index: number): Promise<void> {
  if (!this.message.trim()) return;
  
  clearTimeout(this.messageDebounceTimer);
  
  this.messageDebounceTimer = setTimeout(async () => {
    try {
      this.isSending = true;
      const response = await this.bookingService.sendMessage(demand._id, this.message).toPromise();
      
      if (response?.success && response.conversation) {
        const newMessage = {
          _id: response.conversation._id,
          message: response.conversation.message,
          sender: {
            _id: response.conversation.sender._id,
            firstName: response.conversation.sender.name.split(' ')[0],
            lastName: response.conversation.sender.name.split(' ')[1] || '',
            profileImage: ''
          },
          attachments: response.conversation.attachments || [],
          createdAt: new Date(response.conversation.createdAt)
        };
        
        if (demand.conversation) {
          demand.conversation.push(newMessage);
        } else {
          demand.conversation = [newMessage];
        }
        
        this.message = '';
      }
    } catch (error) {
      this.handleError(error, 'Failed to send message');
    } finally {
      this.isSending = false;
    }
  }, 500);
}

  generateContract(demand: booking): void {
    const contractData = {
      owner: this.ownerName,
      renter: demand.contactInfo?.name || 'Locataire',
      property: demand.property?.title || 'Propriété',
      price: demand.property?.price || 0,
      date: this.todayDate,
      terms: [
        'Le locataire s\'engage à payer le loyer à temps',
        'Tous les dommages seront à la charge du locataire',
        'Durée du contrat: 1 an'
      ]
    };
    
    console.log('Contract data:', contractData);
    this.showSuccess('Contrat généré avec succès');
  }

  // transformImgUrl(url: string): any {
  //   return this.sanitizer.bypassSecurityTrustResourceUrl(url || 'public/favicon-96x96.png');
  // }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Fermer', { 
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Fermer', { 
      duration: 3000,
      panelClass: ['error-snackbar']
    });
  }

  private handleError(error: any, defaultMessage: string): void {
    const errorMessage = error.error?.message || 
                        error.message || 
                        defaultMessage;
    this.showError(errorMessage);
    console.error(error);
  }

  onSearchChange(): void {
    this.filterDemands();
  }

  onStatusFilterChange(): void {
    this.filterDemands();
  }
  
}