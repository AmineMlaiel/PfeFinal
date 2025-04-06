import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, tap, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PropertyService {
  // Check if the API URL is correct - ensure it matches your backend
  private apiUrl = 'http://localhost:3900/api/properties';

  constructor(private http: HttpClient) {}

  // Get all properties with optional filters
  getProperties(filters: any = {}): Observable<any> {
    // Add isApproved=true by default to only show approved properties
    let params = new HttpParams().append('isApproved', 'true');

    // Add filters to params
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== null && filters[key] !== undefined) {
        params = params.append(key, filters[key]);
      }
    });

    console.log('Fetching properties with URL:', this.apiUrl);
    console.log('Request parameters:', params.toString());

    return this.http.get(this.apiUrl, { params }).pipe(
      tap((response) => console.log('Raw API response:', response)),
      catchError((error) => {
        console.error('Property service error:', error);
        throw error;
      })
    );
  }

  // Get a single property by ID
  getProperty(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  // Create a new property
  createProperty(propertyData: any): Observable<any> {
    return this.http.post(this.apiUrl, propertyData);
  }

  // Update a property
  updateProperty(id: string, propertyData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, propertyData);
  }

  // Delete a property
  deleteProperty(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Get properties owned by the current user
  getMyProperties(): Observable<any> {
    return this.http.get(`${this.apiUrl}/user/my-properties`);
  }

  // Search for properties by text query
  searchProperties(query: string): Observable<any> {
    return this.http.get(`${this.apiUrl}`, {
      params: { search: query },
    });
  }

  // Upload property images
  uploadPropertyImages(
    propertyId: string,
    formData: FormData
  ): Observable<string[]> {
    console.log(`Uploading images for property ${propertyId}`);
    // Log form data content
    const formDataEntries = Array.from(formData.entries());
    console.log(
      'FormData contents:',
      formDataEntries.map((entry) => {
        if (entry[1] instanceof File) {
          return {
            field: entry[0],
            filename: (entry[1] as File).name,
            type: (entry[1] as File).type,
          };
        }
        return entry;
      })
    );

    return this.http
      .post<{ success: boolean; data: string[] }>(
        `${this.apiUrl}/${propertyId}/images`,
        formData
      )
      .pipe(
        tap((response) => console.log('Image upload response:', response)),
        map((response) => response.data),
        catchError((error) => {
          console.error('Image upload error:', error);
          throw error;
        })
      );
  }

  // Get nearby properties
  getNearbyProperties(
    lat: number,
    lng: number,
    distance: number = 10,
    unit: string = 'km'
  ): Observable<any> {
    return this.http.get(`${this.apiUrl}/nearby`, {
      params: {
        lat: lat.toString(),
        lng: lng.toString(),
        distance: distance.toString(),
        unit,
      },
    });
  }

  // Bookmark/unbookmark a property
  bookmarkProperty(propertyId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${propertyId}/bookmark`, {});
  }

  // Get user's bookmarked properties
  getBookmarkedProperties(): Observable<any> {
    return this.http.get(`${this.apiUrl}/bookmarks`);
  }

  // Add a review to a property
  addReview(propertyId: string, reviewData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${propertyId}/reviews`, reviewData);
  }

  // Delete specific property images
  deletePropertyImages(
    propertyId: string,
    imageUrls: string[]
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/${propertyId}/images/delete`, {
      images: imageUrls,
    });
  }

  // Check if current user is owner of the property
  checkPropertyOwnership(propertyId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${propertyId}/check-ownership`);
  }
}
