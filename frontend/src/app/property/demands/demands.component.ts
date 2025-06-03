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
import { Property } from '../../models/property.model';
import jsPDF from 'jspdf';

enum DemandStatus {
  PENDING = 'En attente',
  ACCEPTED = 'Acceptée',
  REJECTED = 'Refusée'
}


interface User {
  _id?: string;
  id?: string;
  name?: string;
  lastName?: string;
  FirstName?: string;
  email?: string;
  mobileNumber?: string;
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
  totalPrice?:string;
  checkIn?: string | Date;
  checkOut?: string | Date;
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
        user.name || user.FirstName,
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

   generateContract(demand: booking) {
    // Use the passed 'demand' object directly as bookingData
    const bookingData = demand;
    
    // Construct renterData from bookingData.contactInfo
    // Provide default values if contactInfo is missing
    const renterData: User = {
        name: bookingData.contactInfo?.name || 'N/A',
        email: bookingData.contactInfo?.email || 'N/A',
        mobileNumber: bookingData.contactInfo?.phone || 'N/A',
        // Add other User fields if they can be derived or are needed
    };

    // Use the simplified property data available in the booking object
    const propertyData = bookingData.property || { title: 'N/A', price: 0 };

    // --- PDF Generation Logic --- 
    const pdf = new jsPDF('p', 'mm', 'a4');

    // Header with Rentify branding (remains the same)
    pdf.setFillColor(52, 152, 219);
    pdf.rect(0, 0, 210, 35, 'F');
    pdf.setFillColor(255, 255, 255);
    pdf.rect(20, 8, 18, 18, 'F');
    pdf.setTextColor(52, 152, 219);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('R', 27, 20);
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.text('RENTIFY', 45, 20);
    pdf.setFontSize(8);
    pdf.text('Professional Rental Platform', 45, 26);

    // Contract title (remains the same)
    pdf.setTextColor(44, 62, 80);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RENTAL AGREEMENT CONTRACT', 105, 50, { align: 'center' });
    
    // Contract number and date (remains the same)
    pdf.setFontSize(10);
    pdf.text(`Contract Date: ${new Date().toLocaleDateString()}`, 20, 65);
    pdf.text(`Contract ID: RENT-${Date.now().toString().slice(-6)}`, 150, 65);

    let y = 80;

    // Property Information - Simplified
    pdf.setFillColor(240, 240, 240);
    pdf.rect(20, y, 170, 7, 'F');
    pdf.setTextColor(44, 62, 80);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PROPERTY INFORMATION', 25, y + 5);
    
    y += 15;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    pdf.text(`Property: ${propertyData.title || 'N/A'}`, 25, y);
    // Removed fields not available in booking.property:
    // pdf.text(`Type: ${propertyData.propertyType}`, 25, y + 5);
    // pdf.text(`Address: ${propertyData.address?.street || propertyData.address}`, 25, y + 10);
    // pdf.text(`City: ${propertyData.address?.city || ''}, ${propertyData.address?.country || ''}`, 25, y + 15);
    // pdf.text(`Bedrooms: ${propertyData.bedrooms}`, 25, y + 20);
    // pdf.text(`Bathrooms: ${propertyData.bathrooms}`, 100, y + 20);
    // pdf.text(`Area: ${propertyData.area} sqm`, 25, y + 25);
    y += 10; // Adjust spacing after removing lines

    y += 20; // Adjust spacing

    // Renter Information (using derived renterData)
    pdf.setFillColor(240, 240, 240);
    pdf.rect(20, y, 170, 7, 'F');
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RENTER INFORMATION', 25, y + 5);
    
    y += 15;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    // Use derived renterData fields
    pdf.text(`Name: ${renterData.name || 'N/A'}`, 25, y);
    pdf.text(`Email: ${renterData.email || 'N/A'}`, 25, y + 5);
    pdf.text(`Phone: ${renterData.mobileNumber || 'N/A'}`, 25, y + 10);
    
    y += 25;

    // Contact Person section removed as renter info is derived from contactInfo
    // If contactInfo is different from the actual renter, this logic needs adjustment

    // Rental Terms (using bookingData)
    pdf.setFillColor(240, 240, 240);
    pdf.rect(20, y, 170, 7, 'F');
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RENTAL TERMS', 25, y + 5);
    
    y += 15;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    const checkIn = bookingData.checkIn ? new Date(bookingData.checkIn) : null;
    const checkOut = bookingData.checkOut ? new Date(bookingData.checkOut) : null;
  
    pdf.text(`Check-in: ${checkIn ? checkIn.toLocaleDateString() : 'N/A'}`, 25, y);
    pdf.text(`Check-out: ${checkOut ? checkOut.toLocaleDateString() : 'N/A'}`, 100, y);
    pdf.text(`Total Price: DT${bookingData.totalPrice || 'N/A'}`, 25, y + 10);
    // Removed cleaning fee as it's part of full Property data
    // if (propertyData.cleaningFee) { ... }
    pdf.text(`Status: ${bookingData.statut || bookingData.status?.toUpperCase() || 'PENDING'}`, 25, y + 15);

    y += 30;

    // Property Features section removed as it requires full Property data
    // if (propertyData.features && propertyData.features.length > 0) { ... }

    // Terms and Conditions (remains the same)
    pdf.setFillColor(240, 240, 240);
    pdf.rect(20, y, 170, 7, 'F');
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TERMS & CONDITIONS', 25, y + 5);
    
    y += 15;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    
    const terms = [
      '1. The renter agrees to pay the total amount as specified above.',
      '2. Check-in and check-out times must be respected.',
      '3. Property must be left in the same condition as found.',
      '4. Any damages will be charged separately.',
      '5. Cancellation policy applies as per Rentify terms.'
    ];
    
    terms.forEach((term, index) => {
      pdf.text(term, 25, y + (index * 5));
    });

    y += 35;

    // Signatures (remains the same, uses ownerName from component)
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Owner Signature:', 25, y); // Owner is the logged-in user (this.ownerName)
    pdf.text('Renter Signature:', 120, y); // Renter is from contactInfo
    
    pdf.line(25, y + 10, 80, y + 10);
    pdf.line(120, y + 10, 175, y + 10);
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(this.ownerName, 25, y + 15); // Add owner name below line
    pdf.text(renterData.name || 'N/A', 120, y + 15); // Add renter name below line
    pdf.text('Date: __________', 25, y + 20);
    pdf.text('Date: __________', 120, y + 20);

    // Footer (remains the same)
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text('Generated by Rentify Platform - Professional Rental Management', 105, 285, { align: 'center' });

    // Save the PDF (using renter name from derived data)
    const safeRenterName = (renterData.name || 'UnknownRenter').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `rental-contract-${safeRenterName}-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
    
    this.showSuccess(`Contract ${fileName} generated successfully.`);
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