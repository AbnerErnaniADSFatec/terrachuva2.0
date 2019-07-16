import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AnaliseGeotiffByYearDiff } from '../map/rasters/analise-geotiff-by-year-diff';
import { AnaliseGeotiffByYear } from '../map/rasters/analise-geotiff-by-year';
import { AnaliseGeotiff } from '../map/rasters/analise-geotiff';
import { CityByState } from '../map/entities/city-by-state';
import { State } from '../map/entities/state';
import { StateUnique } from '../map/entities/state-unique';
import { CityByStateUnique } from '../map/entities/city-by-state-unique';

@Injectable({
  providedIn: 'root'
})

export class PythonFlaskAPIService{
  private localhost = 'http://localhost:4863';
  private colors = {'blue':'#007bff','red':'#ff2f00'};
  constructor( private httpClient: HttpClient ) {}

  getMonthlyMaxMean(geocodigo: string, ano: number){
    return this.httpClient.get<AnaliseGeotiffByYear>(this.localhost + '/an_monthly/' + geocodigo + '/' + ano.toString());
  }

  getMergeMonthlyMaxMean(geocodigo: string){
    return this.httpClient.get<AnaliseGeotiff>(this.localhost + '/an_merge_monthly/' + geocodigo);
  }

  getMergeMonthlyMaxMeanDiff(geocodigo: string, ano: number){
    return this.httpClient.get<AnaliseGeotiffByYearDiff>(this.localhost + '/an_merge_monthly_diff/' + geocodigo + '/' + ano.toString());
  }

  getCities(uf: string){
    return this.httpClient.get<CityByState>(this.localhost + '/cities/' + uf);
  }

  getStates(){
    return this.httpClient.get<State>(this.localhost + '/states');
  }

  convertToArray(obj: Object){
    let vetor = [];
    for( let i = 0; obj[i] != null; i++ ){ vetor[i] = obj[i]; }
    return vetor;
  }

  convertToColors(obj: Object){
    let vetor = [];
    for( let  i = 0; obj[i] != null; i++){
      if( obj[i] < 0) { vetor[i] = this.colors['red'] }
      else { vetor[i] = this.colors['blue'] }
    }
    return vetor;
  }

  convertToDateArray(data: string[]){
    let vetor = [];
    for( let i = 0; data[i] != null; i++){ vetor[i] = new Date(data[i]) }
    return vetor;
  }

  convertToCityAPI(nome1: string[], longitude: number[], latitude: number[], geocodigo: string[]){
    let cities: CityByStateUnique[] = [];
    for( let i in nome1 ){ cities[i] = { nome1 : nome1[i], longitude: longitude[i], latitude : latitude[i], geocodigo : geocodigo[i] }; }
    return cities;
  }

  convertToStateAPI(estado: string[], uf: string[]){
    let states: StateUnique[] = [];
    for( let i in estado ){ states[i] = { estado : estado[i], uf : uf[i] }; }
    return states;
  }
}