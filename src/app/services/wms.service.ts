import { Injectable } from '@angular/core';

import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';

// Model Entity
import { Layer } from '../map/tile-layers/layer';

@Injectable({
  providedIn: 'root'
})
export class WmsService {

  private features;

  constructor() { }

  camadas(Layers) {
    this.features = new TileLayer({
      title: Layers.name,
      source: new TileWMS({
        url: "http://localhost:8080/geoserver/wms?",
        params: {
          'LAYERS': Layers.workspace + ":" + Layers.layername,
          'VERSION': '1.1.1',
          'FORMAT': 'image/png',
          'EPSG': "4326",
          'TILED': true
        },
        projection: "4326",
        serverType: 'geoserver',
        name: Layers.name
      })
    });
    this.features.setVisible(false);
    return this.features;
  }

  getRecort(tileLayer:TileLayer, geocodigo:string){
    tileLayer.getSource().updateParams({ 'cql_filter' : ('cd_geocmu=').concat(geocodigo)});
  }

  upDate(tileLayer:TileLayer, date: Date){
    tileLayer.getSource().updateParams({'TIME' : date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate()});
  }
}
