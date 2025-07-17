import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { UserModel } from 'src/app/shared/models/userModel';
import { routePath } from 'src/app/shared/routePath';
import { jwtDecode } from 'jwt-decode'

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(
    private http: HttpClient,
    private router: Router,
  ) { }

  routeP = new routePath();
  token: any;
  accessToken = 'accessToken';

  public register(formData: UserModel) {
    const api_url = this.routeP.server_url+this.routeP.registerServer;
    return this.http.post<any>(api_url, formData);
  }

  public login(formData: UserModel) {
    const api_url = this.routeP.server_url+this.routeP.loginServer;
    return this.http.post<any>(api_url, formData);
  }

  public updateUser(formData: UserModel) {
    const api_url = this.routeP.server_url+this.routeP.updateUserServer+this.getTokenId();
    return this.http.patch<any>(api_url, formData);
  }

  public deleteUser() {
    const api_url = this.routeP.server_url+this.routeP.deleteUserServer+this.getTokenId();
    return this.http.delete<any>(api_url);
  }

  public displayUser() {
    const api_url = this.routeP.server_url+this.routeP.displayUserServer+this.getTokenId();
    return this.http.get<any>(api_url);
  }

  //user logged in
  public LoggedIn() {
    const accessToken: any = localStorage.getItem(this.accessToken);
    return !!accessToken;
  }

  //user logged out
  public LogOut() {
    localStorage.removeItem(this.accessToken);
    location.href = this.routeP.slase+this.routeP.login;
  }

  // forgot password
  public forgotPassword(formData: UserModel) {
    const api_url = this.routeP.server_url+this.routeP.forgotPasswordServer;
    return this.http.post<any>(api_url, formData);
  }

  public resetPassword(formData: UserModel, id: string) {
    const api_url = this.routeP.server_url+this.routeP.updateUserServer+id;
    return this.http.patch<any>(api_url, formData);
  }

  // token
  public getToken() {
    const accessToken: any = localStorage.getItem(this.accessToken);
    return accessToken;
  }

  public getTokenId() {
    const accessToken: any = localStorage.getItem(this.accessToken);
    this.token = jwtDecode(accessToken)
    return this.token.audiance;
  }

  public getTokenUserName() {
    const accessToken: any = localStorage.getItem(this.accessToken);
    this.token = jwtDecode(accessToken)
    return this.token.name;
  }

  public getTokenAuth() {
    const accessToken: any = localStorage.getItem(this.accessToken);
    this.token = jwtDecode(accessToken);
    return this.token.auth;
  }

  public getTokenStat() {
    const accessToken: any = localStorage.getItem(this.accessToken);
    this.token = jwtDecode(accessToken);
    return this.token.stat;
  }

}
