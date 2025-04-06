import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ReviewService {
  private apiUrl = 'http://localhost:3900/api/reviews';

  constructor(private http: HttpClient) {}

  // Get all reviews for a property
  getPropertyReviews(propertyId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/property/${propertyId}`);
  }

  // Get a single review
  getReview(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  // Create a new review
  createReview(reviewData: any): Observable<any> {
    return this.http.post(this.apiUrl, reviewData);
  }

  // Update a review
  updateReview(id: string, reviewData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, reviewData);
  }

  // Delete a review
  deleteReview(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Add owner response to a review
  addReviewResponse(id: string, text: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/response`, { text });
  }

  // Approve or disapprove a review (admin only)
  approveReview(id: string, approved: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/approve`, { approved });
  }
}
