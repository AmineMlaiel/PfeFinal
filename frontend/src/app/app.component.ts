// app.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true, // Mark as standalone
  imports: [CommonModule, RouterModule], // Import dependencies
  templateUrl: './app.component.html', // Link to the template
  styleUrls: ['./app.component.scss'], // Link to the styles
})
export class AppComponent {}