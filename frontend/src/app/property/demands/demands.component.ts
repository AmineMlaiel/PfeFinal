import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

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
    MatFormFieldModule
  ],
  templateUrl: './demands.component.html',
  styleUrls: ['./demands.component.scss']
})
export class DemandsComponent implements OnInit {
  demands: any[] = [];
  message: string = '';
  ownerName: string = '';
  todayDate: string = '';

  constructor() { }

  ngOnInit(): void {
    this.loadDemands();
    this.ownerName = 'Your Name';
    this.todayDate = new Date().toLocaleDateString();
  }

  loadDemands(): void {
    // This will be replaced with your actual data loading logic
    this.demands = [
      {
        _id: '1',
        statut: 'En attente',
        annonceInfos: {
          titre: 'Studio Modern au Centre-Ville',
          adresse: '123 Rue de la République, 75001 Paris',
          price: 800
        },
        contactInfo: {
          name: 'Jean Dupont',
          email: 'jean.dupont@example.com',
          phone: '+33 6 12 34 56 78'
        },
        conversation: [
          {
            sender: {
              firstName: 'Jean',
              profileImage: 'assets/user-avatar.jpg'
            },
            message: 'Bonjour, je suis intéressé par votre appartement. Est-il toujours disponible?'
          }
        ]
      },
      {
        _id: '2',
        statut: 'Acceptée',
        annonceInfos: {
          titre: 'Appartement Spacieux avec Vue',
          adresse: '45 Avenue Marceau, 75008 Paris',
          price: 1200
        },
        contactInfo: {
          name: 'Marie Martin',
          email: 'marie.martin@example.com',
          phone: '+33 7 98 76 54 32'
        },
        conversation: [
          {
            sender: {
              firstName: 'Marie',
              profileImage: 'assets/user-avatar.jpg'
            },
            message: 'Bonjour, quand pourrais-je visiter l\'appartement?'
          }
        ]
      }
    ];
  }

  acceptDemand(demandId: string, index: number): void {
    // Implement accept logic
    this.demands[index].statut = 'Acceptée';
  }

  refuseDemand(demandId: string, index: number): void {
    // Implement reject logic
    this.demands[index].statut = 'Refusée';
  }

  sendMessage(demand: any, index: number): void {
    // Implement send message logic
    if (this.message.trim()) {
      demand.conversation.push({
        sender: {
          firstName: this.ownerName,
          profileImage: 'assets/owner-avatar.jpg'
        },
        message: this.message
      });
      this.message = '';
    }
  }

  generateContract(): void {
    // Implement contract generation logic
    console.log('Generating contract...');
  }

  transformImgUrl(url: string): string {
    // Implement image transformation logic
    return url || 'assets/default-avatar.jpg';
  }
}