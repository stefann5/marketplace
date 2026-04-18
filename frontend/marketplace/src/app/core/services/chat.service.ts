import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ChatSessionDetail,
  ChatSessionSummary,
  SendMessageResponse
} from '../models/chat.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly apiUrl = `${environment.apiUrl}/api/chat`;

  constructor(private http: HttpClient) {}

  listSessions(): Observable<ChatSessionSummary[]> {
    return this.http.get<ChatSessionSummary[]>(`${this.apiUrl}/sessions`);
  }

  createSession(): Observable<ChatSessionDetail> {
    return this.http.post<ChatSessionDetail>(`${this.apiUrl}/sessions`, {});
  }

  getSession(id: string): Observable<ChatSessionDetail> {
    return this.http.get<ChatSessionDetail>(`${this.apiUrl}/sessions/${id}`);
  }

  deleteSession(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/sessions/${id}`);
  }

  sendMessage(sessionId: string, message: string): Observable<SendMessageResponse> {
    return this.http.post<SendMessageResponse>(
      `${this.apiUrl}/sessions/${sessionId}/messages`,
      { message }
    );
  }
}
