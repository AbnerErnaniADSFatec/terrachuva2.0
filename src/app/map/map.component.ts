import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import Map from 'ol/Map';
import {defaults as defaultControls, ScaleLine} from 'ol/control.js';
import MousePosition from 'ol/control/MousePosition.js';
import {createStringXY} from 'ol/coordinate.js';
import View from 'ol/View';
import FullScreen from 'ol/control/FullScreen';
import DragRotateAndZoom from 'ol/interaction/DragRotateAndZoom';
import DragAndDrop from 'ol/interaction/DragAndDrop';
import GeoJSON from 'ol/format/GeoJSON';
import * as olProj from 'ol/proj';

// Classes criadas
import { BaseLayers } from './base-layers/base-layers';
import { Layer } from './tile-layers/layer';

// Serviços Criados
import { MapService } from 'src/app/services/map.service';
import { WmsService } from 'src/app/services/wms.service';
import { PythonFlaskAPIService } from 'src/app/services/python-flask-api.service';

// Interfaces Criadas
import { AnaliseGeotiffByYear } from './rasters/analise-geotiff-by-year';
import { AnaliseGeotiffByYearDiff } from './rasters/analise-geotiff-by-year-diff';
import { AnaliseGeotiff } from './rasters/analise-geotiff';
import { CityByState } from './entities/city-by-state';
import { CityByStateUnique } from './entities/city-by-state-unique';
import { State } from './entities/state';
import { StateUnique } from './entities/state-unique';
import { Option } from './entities/option';
// import { Terrama2 } from './entities/terrama2';
// import { Terrama2Unique } from './entities/terrama2-unique';

// Camadas MapG
import TileLayer from 'ol/layer/Tile.js';
import { OSM } from 'ol/source.js';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})

export class MapComponent implements OnInit {
  private geoserverTerraMaLocal = 'http://localhost:8080/geoserver/wms?';
  private geoserverCemaden = 'http://200.133.244.148:8080/geoserver/cemaden_dev/wms';
  private geoserver20Chuva = 'http://www.terrama2.dpi.inpe.br/chuva/geoserver/wms?';

  private map;
  private mapG;
  private baseLayers = new BaseLayers();
  private layersStatic = [];
  private layersDynamic = [];
  private layers = [];
  private features = [];

  private dataGraficoMedia = { 
    "Mensal": NaN,
    "Anomalia": NaN
  };

  private dataGraficoMáxima = { 
    "Mensal": NaN,
    "Anomalia": NaN
  };

  private dataGraficoMediaMensal: any;
  private dataGraficoMaximaMensal: any;
  private dataGraficoMediaAnomalia: any;
  private dataGraficoMaximaAnomalia: any;

  // Busca de cidades via codigo no python API
  private citySelectedAPI: CityByStateUnique;
  private ufSelectedAPI: StateUnique;
  private ufsAPI: StateUnique[] = [];
  private citiesAPI: CityByStateUnique[] = [];

  // Escolher gráfico
  private chartOption: Option[] = [
    { verbose: "Média", value: 0 },
    { verbose: "Anomalia Média", value: 1 },
    { verbose: "Máxima", value: 2 },
    { verbose: "Anomalia Máxima", value: 3 }
  ];
  private selectChartOption: Option = { verbose: "Média", value: 0 };
  private chartData: any;

  value: number = 0;
  testep: boolean = false;
  setMap: string = 'osm';
  mergeMonthlyDate: number = 1;
  mergeYearlyDate: number = 2015;

  minDate: Date;
  maxDate: Date;
  invalidDates: Array<Date>;

  // Banco de dados
  private jsonObj;

  // Menu Principal
  private items: MenuItem[];

  constructor(private mapService: MapService, private wmsService: WmsService, private apiFlask: PythonFlaskAPIService) { }

  ngOnInit() {
    this.promise();
    this.initDate();
    this.initLayers();
    this.initState();
    this.initilizeJson();
    this.initilizeMap();
    this.initilizeMapG();
    this.initilizeMenu();
  }

  promise() {
    this.mapService.listar().toPromise()
      .then((data: any) => {
        // console.time('request-length');
        console.log(data);
        // console.timeEnd('request-length');
        this.jsonObj = data;
        data.forEach(element => {
          console.log(element)
          this.features[element.name] = this.wmsService.camadas(element);
          this.map.addLayer(this.features[element.name]);
          this.mapG.addLayer(this.features[element.name]);
        });
      });
  }

  initDadosGrafico() {
    console.log(this.citySelectedAPI.geocodigo);
    this.setViewMapG();
    this.wmsService.getRecort(this.layersDynamic[2].getTileLayer(),this.citySelectedAPI.geocodigo);
    // Automatizar
    let data = new Date();
    data.setDate(31); data.setMonth(0); data.setFullYear(this.mergeYearlyDate);
    this.wmsService.upDate(this.layersDynamic[2].getTileLayer(),this.layers[5].date);
    // =======================================
    this.apiFlask.getMergeMonthlyMaxMeanDiff(this.citySelectedAPI.geocodigo,this.mergeYearlyDate).subscribe( (data: AnaliseGeotiffByYearDiff) => {
      this.dataGraficoMediaAnomalia = {
        labels: this.apiFlask.convertToArray(data.mes),
        datasets: [
          {
            label: 'Diferença Média ' + this.mergeYearlyDate + ' do Município de ' +
              this.citySelectedAPI.nome1 +
              " - " +
              this.ufSelectedAPI.estado,
            backgroundColor:'#007bff',
            borderColor: '#55a7ff',
            data: this.apiFlask.convertToArray(data.var_media)
          }
        ]
      };
      this.dataGraficoMaximaAnomalia = {
        labels: this.apiFlask.convertToArray(data.mes),
        datasets: [
          {
            label: 'Diferença Máxima ' + this.mergeYearlyDate + ' do Município de ' +
              this.citySelectedAPI.nome1 +
              " - " +
              this.ufSelectedAPI.estado,
            backgroundColor:'#007bff',
            borderColor: '#55a7ff',
            data: this.apiFlask.convertToArray(data.var_maxima)
          }
        ]
      };
    });
    this.apiFlask.getMonthlyMaxMean(this.citySelectedAPI.geocodigo,this.mergeYearlyDate).subscribe( (data: AnaliseGeotiffByYear) => {
      this.dataGraficoMediaMensal = {
        labels: this.apiFlask.convertToArray(data.mes),
        datasets: [
          {
            label: 'Média Climatológica Mensal do Município de ' +
              this.apiFlask.convertToArray(data.nome_municipio)[0].toString() +
              " - " +
              this.ufSelectedAPI.estado,
            backgroundColor:'#007bff',
            borderColor: '#55a7ff',
            data: this.apiFlask.convertToArray(data.media)
          },
          {
            label: 'Média ' + this.mergeYearlyDate + ' Mensal do Município de ' +
              this.apiFlask.convertToArray(data.nome_municipio)[0].toString() +
              " - " +
              this.ufSelectedAPI.estado,
            backgroundColor:'#80bdff',
            borderColor: '#9ecdff',
            data: this.apiFlask.convertToArray(data.media_ano)
          }
        ]
      };
      this.dataGraficoMaximaMensal = {
        labels: this.apiFlask.convertToArray(data.mes),
        datasets: [
          {
            label: 'Máxima Climatológica Mensal do Município de ' + 
              this.apiFlask.convertToArray(data.nome_municipio)[0].toString() +
              " - " +
              this.ufSelectedAPI.estado,
            backgroundColor: '#007bff',
            borderColor: '#55a7ff',
            data: this.apiFlask.convertToArray(data.maxima)
          },
          {
            label: 'Máxima ' + this.mergeYearlyDate + ' Mensal do Município de ' + 
              this.apiFlask.convertToArray(data.nome_municipio)[0].toString() +
              " - " +
              this.ufSelectedAPI.estado,
            backgroundColor: '#80bdff',
            borderColor: '#9ecdff',
            data: this.apiFlask.convertToArray(data.maxima_ano)
          }
        ]
      };
    });
    this.changeChartType();
  }

  initDate() {
    this.minDate = new Date();
    this.minDate.setDate(2);
    this.minDate.setMonth(0);
    this.minDate.setFullYear(1998);
    this.maxDate = new Date();
    this.invalidDates = [this.minDate, this.maxDate];
  }

  initLayers() {
    this.layers = [];
    this.layersStatic = [
      new Layer(1, "Estados Brasil Político", "OBT DPI", 'terrama2_10:view10', '4674', this.geoserver20Chuva),
      new Layer(2, "Divisão dos Estados", "Cemaden", 'cemaden_dev:br_estados', '4326', this.geoserverCemaden),
      new Layer(3, "Municípios IBGE", "OBT DPI", 'terrama2_9:view9', '4326', this.geoserver20Chuva)
    ];
    this.layersDynamic = [
      new Layer(4, "Preciptação", "OBT DPI", 'terrama2_3:view3','4326', this.geoserver20Chuva),
      new Layer(5, "Análise Merge Monthly", "OBT DPI", 'terrama2_87:view87','4326', this.geoserverTerraMaLocal),
      new Layer(6, "Análise Monthly", "OBT DPI", 'terrama2_88:view88','4326', this.geoserverTerraMaLocal)
    ];
    this.layers = this.layers.concat(this.layersStatic);
    this.layers = this.layers.concat(this.layersDynamic);
  }

  initState(){
    this.apiFlask.getStates().subscribe( (data:State) => {
      this.ufsAPI = this.apiFlask.convertToStateAPI(this.apiFlask.convertToArray(data.estado),this.apiFlask.convertToArray(data.uf));
    });
  }

  initilizeMapG(){
    this.mapG = new Map({
      controls: [new FullScreen()],
      layers: [
        new TileLayer({
          preload: Infinity,
          visible: true,
          title: "osm",
          baseLayer: true,
          source: new OSM(),
          layer: 'osm',
        }),
        this.layersDynamic[1].getTileLayer(),
        this.layersDynamic[2].getTileLayer()
      ],
      target: 'mapG',
      view: new View({
        center: [-6124801.2015023, -1780692.0106836],
        zoom: 4
      })
    });
  }

  initilizeMap() {
    var mousePositionControl = new MousePosition({
      coordinateFormat: createStringXY(4),
      projection: 'EPSG:4326', /** 3857 */
      className: 'custom-mouse-position',
      target: document.getElementById('mouse-position'),
      undefinedHTML: '&nbsp;'
    });

    var viewMap = new View({
      center: [-6124801.2015023, -1780692.0106836],
      zoom: 4
    });

    this.map = new Map({
      controls: defaultControls().extend([mousePositionControl, new FullScreen(), new DragRotateAndZoom(), new DragAndDrop()], new ScaleLine({units: 'degrees'})),
      layers: this.features,
      target: 'map',
      view: viewMap
    });

    this.map.on('click', function(event){
      this.mouseCoordinate = olProj.transform(event.coordinate, 'EPSG:3857', 'EPSG:4326');
      console.log("4326 Lat: " + this.mouseCoordinate[0] + " Long: " + this.mouseCoordinate[1]);
    });

    var layersWMS = this.layers;
    this.map.on('singleclick', function(event){
      document.getElementById('info').innerHTML = '';
      var viewResolution = viewMap.getResolution();
      var viewProjection = viewMap.getProjection();
      for( let layer of layersWMS ){
        if( layer.checked ){
          var url = layer.getTileLayer().getSource().getGetFeatureInfoUrl(
            event.coordinate, viewResolution, viewProjection,
            "EPSG:4326",
            { 'INFO_FORMAT' : 'text/javascript', 'propertyName' : 'formal_en' }
          );
        }
      }
      if(url){
        console.log(url);
        document.getElementById('info').innerHTML = '<iframe id = "infoFrame" seamless src = "' + url + '"></iframe>';
      }
    });

    var mapAuxiliar = this.map;
    this.map.on('pointermove', function(event){
      if( event.dragging ){
        return true;
      }
      var pixel = mapAuxiliar.getEventPixel(event.originalEvent);
      var hit = mapAuxiliar.forEachLayerAtPixel(pixel, function(){
        return true;
      });
      mapAuxiliar.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });

    function changeMap() {
      console.log('name');
    }
    this.baseLayers.setBaseLayers(this.setMap);
  }

  initilizeJson() {
    var tileLayers = []
    for( let ind in this.layers ){ tileLayers[ind] = this.layers[ind].getTileLayer() }
    this.features = this.baseLayers.getBaseLayers().concat(tileLayers);
  }

  initilizeMenu(){
    this.items = [
      {
        label: 'Dados Estáticos',
        icon: 'pi pi-pw pi-file',
        items: []
      },
      {
        label: 'Dados Dinâmicos',
        icon: 'pi pi-pw pi-file',
        items: []
      },
      {
        label: 'Opções',
        icon: 'pi pi-pw pi-file',
        items: [
          {
            label: 'Análises',
            icon: 'pi pi-pw pi-file'
          }
        ]
      }
    ];
  }

  private changeChartType(){
    switch(this.selectChartOption.value){
      case 0:
        this.chartData = this.dataGraficoMediaMensal
        break;
      case 1:
        this.chartData = this.dataGraficoMediaAnomalia
        break;
      case 2:
        this.chartData = this.dataGraficoMaximaMensal
        break;
      case 3:
        this.chartData = this.dataGraficoMaximaAnomalia
        break;
      default:
        break;
    }
  }

  private setLayerType(){
    for ( let layer of this.layers ){
      layer.getTileLayer().setVisible(layer.checked);
      layer.getTileLayer().setOpacity(layer.opacidade/100);
    }
  }

  private setLayerTime(){
    for ( let layer of this.layers ){
      this.wmsService.upDate(layer.getTileLayer(),layer.date);
    }
  }

  private setMapType() {
    this.baseLayers.setBaseLayers(this.setMap);
  }

  private legenda(featuresLayer, featuresGeoserver){
    var url = featuresGeoserver + "REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&WIDTH=20&HEIGHT=20&legend_options=forceLabels:on&LAYER={{LAYER_NAME}}&STYLE={{STYLE_NAME}}"
    url = url.replace('{{LAYER_NAME}}', featuresLayer);
    url = url.replace('{{STYLE_NAME}}', featuresLayer + '_style');
    if(url){
      var parser = new GeoJSON();
      document.getElementById('legenda').innerHTML = '<iframe allowfullscreen height = "800" src = ' + url + '></iframe>';
    }
  }

  private salvar(){
    var group = this.map.getLayerGroup();
    var gruplayers = group.getLayers();
    var layers = this.map.getLayers().getArray();
    for (var i = 5; i < layers.length; i++) {
      var element = gruplayers.item(i);
      var name = element.get('title');
      console.log(name);
    }
  }

  private setViewMapG() {
    let cord = [this.citySelectedAPI.longitude, this.citySelectedAPI.latitude];
    this.mapG.setView(new View({
      center: cord, zoom: 12, projection: 'EPSG:4326'
    }));
    console.log(cord);
  }

  private configSelectDataGrafico(){
    console.log(this.ufSelectedAPI.uf);
    this.citiesAPI = [];
    this.apiFlask.getCities(this.ufSelectedAPI.uf).subscribe( (data: CityByState) => {
      this.citiesAPI = this.apiFlask.convertToCityAPI(
        this.apiFlask.convertToArray(data.nome1),
        this.apiFlask.convertToArray(data.longitude),
        this.apiFlask.convertToArray(data.latitude),
        this.apiFlask.convertToArray(data.geocodigo)
      );
    });
  }

  activeLayer(index){
    for( let feature of this.features ){ feature.setZIndex(0); }
    this.features[index].setZIndex(1);
  }

  dellLayer(){
    for ( let layer of this.layers ){
      this.map.removeLayer(layer);
    }
  }
}