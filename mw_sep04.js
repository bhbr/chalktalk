



var xEyeballFragmentShader = [
,'   float car2radius(vec3 P) {'
,'      float rad = sqrt(P.x*P.x + P.y*P.y + P.z*P.z);'
,'      return rad;'
,'   }'
,'   float car2incl(vec3 P, float rad) {'
,'      float incl = acos(P.z / rad);'
,'      return incl;'
,'   }'
,'   float car2azi(vec3 P) {'
,'      float azi = atan(P.y / P.x);'
,'      return azi;'
,'   }'
,'   float latamp(float inazi){'
,'      float latitude = smoothstep(0.9, 0.95 , fract(inazi/(2.*3.14159) * 10.));'
,'      return latitude;'
,'   }'
,'   float longamp(float inincl){'
,'      float longitude = smoothstep(0.9, 0.95 , fract(inincl/3.14159 * 10.));'
,'      return longitude;'
,'   }'
,'   vec3  proc_env_map(float radius, vec3 Vdir, vec3 C1, vec3 C2, float azi_factor, float incl_factor) {'
,'      vec3 out_color = vec3(0.0, 0.0, 0.0);'
,'      vec3 P;'
,'      vec3 Pnoise;'
,'      float turb;'
,'      float in_azi, in_incl;'
,'      const float noise_z = 32.1113;'
,'      P = Vdir; // ignore radius, assume it is 1.0'
,'      in_azi = car2azi(P);'
,'      in_incl = car2incl(P, 1.0);'
,'      Pnoise.x = in_azi * azi_factor + -10.3333;'
,'      Pnoise.y = in_incl * incl_factor + 204.11;'
,'      Pnoise.z = noise_z;'
,'      turb = turbulence(Pnoise);'
,'      out_color = mix(C2, C1, (latamp(in_azi) + longamp(in_incl)) * 0.5);'
,'      return out_color;'
,'   }'
,'   vec3 gamma_encode(vec3 inclr, float gamma) {'
,'      vec3 r;'
,'      r = vec3(pow(inclr.x,gamma), pow(inclr.y,gamma), pow(inclr.z,gamma));'
,'      return r;'
,'   }'
,'   void main(void) {'
,'      const int numLights = 2;'
,'      const float specpow = 7.0;'
,'      vec3 light_color[numLights];'
,'      vec3 light_pt[numLights];'
,'      vec3 light_amp[numLights];  // amb, diff, spec'
,'      float diff_amp[numLights];'
,'      float spec_amp[numLights];'
,'      vec3  refl_dir[numLights];'
,'      light_color[0] = vec3(1., 1., 1.);'
,'      light_color[1] = vec3(1., 0.2, 0.2);'
,'      light_pt[0] = vec3(100.0, 40.0, 25.0);'
,'      light_pt[1] = vec3(-50.0, -50.0, -50.0);'
,'      light_amp[0] = vec3(0.1, 0.4, 0.7);'
,'      light_amp[1] = vec3(0.0, 0.1, 0.1);'
,'      //'
,'      float pupil_size = 0.15;'
,'      float iris_size = 0.4;'
,'      float iris_ring = 0.35;'
,'      float iris_ring_size = 0.45;'
,'      float sclera_size = 1.0 - iris_size;'
,'      vec3 eyept = vec3(0.0, 0.0, -100.0);'
,'      vec3 moonpt = vec3(50.0, 50.0, 100.0);'
,'      //'
,'      float mtime = time * 0.025;'
,'      float rad = car2radius(.03*vPosition);'
,'      float incl = car2incl(.03*vPosition, rad); // + sin(mod(time,3.14156)); '
,'      float azi = car2azi(.03*vPosition); //  + sin(mod(time,2.*3.14156));'
,'      float t1 = turbulence(vec3(azi*8.+51.0, incl*16.0+75.2, 251.444));'
,'      float t2 = turbulence(vec3(azi*1.0, incl*1.0, 6251.444));'
,'      float lat_amp = latamp(azi + t2);'
,'      float long_amp = longamp(incl + t2);'
,'      //'
,'      vec3 sclera_clr = vec3(1.,1.,1.);'
,'      vec3 iris_clr = vec3(0., 0.0, 0.5);'
,'      vec3 iris_clr_2 = vec3(0.2, 0.5, 0.2);'
,'      vec3 pupil_clr      = vec3(0., 0., 0.);'
,'      vec3 iris_ring_clr = vec3(0., 0., 0.);'
,'      vec3 hilight_clr  = vec3(1., .9, 1.);'
,'      vec3 line_clr = vec3(0.9, 0.1, 0.1);'
,'      vec3 blood_clr = vec3(1.0, 0.0, 0.0);'
,'      vec3 light_clr = vec3(1., 1., 1.);'
,'      vec3 specC1 = vec3(0.3, 0.3, 0.5);'
,'      vec3 specC2 = vec3(1.0, 1.0, 1.0);'
,'      // float diffamp = 0.5;\n'
,'      // float dfamp = max(0.2, dot(vNormal, normalize((moonpt-.03*vPosition))));'
,'      //'
,'      vec3 color = vec3(0.0,0.0,0.0);'
,'      float sum_amps = 0.0;'
,'      // if (incl > iris_size && incl < 2.0 && azi >= 0.65 && azi <= 0.7) color = mix(color, blood_clr, t1);'
,'      // color = color + (lat_amp*line_clr ) + (long_amp*line_clr);'
,'      //'
,'      vec3   out_color = vec3(0., 0., 0.);'
,'      vec3   viewdir, lightdir, refldir, spec_color;'
,'      float  d_amp, s_amp;'
,'      for (int i = 0; i < numLights; i++) {'
,'         diff_amp[i] = max(0.0, dot(vNormal, normalize((light_pt[i]-.03*vPosition))));'
,'         viewdir = normalize(eyept - .03*vPosition);'
,'         lightdir = normalize(light_pt[i] - .03*vPosition);'
,'         refl_dir[i] = normalize(reflect(lightdir, vNormal));'
,'         spec_amp[i] = pow(max(0., dot(viewdir, refl_dir[i])), specpow);'
,'         sum_amps += diff_amp[i] + spec_amp[i];'
,'      }'
,'      pupil_size = pupil_size - (cos(mtime)*.035) - (sum_amps * .05);'
,'      if (incl <= pupil_size) color = pupil_clr;'
,'      if (incl >= pupil_size && incl <= iris_size) {'
,'         color = mix(iris_clr, iris_clr_2, t1*t1);'
,'         if (incl >= iris_ring) color = mix(color, iris_ring_clr, 0.25+((incl-iris_ring)*10.));'
,'      }'
,'      if (incl > iris_size) color = sclera_clr;'
,'      if (incl > iris_size && (lat_amp+long_amp) > 0.0) color = mix(color, blood_clr, t2 * 0.5);'
,'      for (int i = 0; i < numLights; i++) {'
,'         spec_color = proc_env_map(1.0, refl_dir[i], specC1, specC2, 10.0, 1.0);' 
,'         out_color += (color * light_color[i] * light_amp[i].x) +'
,'            (color * light_color[i] * diff_amp[i] * light_amp[i].y) + (spec_color * light_color[i] * spec_amp[i] * light_amp[i].z);'
,'      }'
,'      out_color = gamma_encode(clamp(out_color, 0.0, 1.0), 0.6);'
,'      gl_FragColor = vec4(out_color, alpha);'
,'   }'			       
].join("\n");

registerGlyph("xEyeball()",[
   makeOval(-1, -1, 2, 2, 32,PI/2,5*PI/2),                // OUTLINE PLANET CCW FROM TOP.
   [ [-1, 1], [1, -1]], 
]);

function xEyeball() {
   var sketch = addSphereShaderSketch(defaultVertexShader, xEyeballFragmentShader);
   sketch.code = [["yplanet", xEyeballFragmentShader],["flame", flameFragmentShader]];
   sketch.enableFragmentShaderEditing();
   sketch.update = function() {
     if (this.isInValueAt(0)) this.rX = this.inValue[0];
     if (this.isInValueAt(1)) this.rY = this.inValue[1];
   }
}



var xRedPlanetFragmentShader = [
,'   float car2radius(vec3 P) {'
,'      float rad = sqrt(P.x*P.x + P.y*P.y + P.z*P.z);'
,'      return rad;'
,'   }'
,'   float car2incl(vec3 P, float rad) {'
,'      float incl = acos(P.z / rad);'
,'      return incl;'
,'   }'
,'   float car2azi(vec3 P) {'
,'      float azi = atan(P.y / P.x);'
,'      return azi;'
,'   }'
,'   float latamp(float inazi){'
,'      const float numLines = 10.0;'
,'      float latitude = smoothstep(0.9, 0.95 , fract(inazi/(2.*3.14159) * numLines));'
,'      return latitude;'
,'   }'
,'   float longamp(float inincl){'
,'      const float numLines = 10.0;'
,'      float longitude = smoothstep(0.9, 0.95 , fract(inincl/3.14159 * numLines));'
,'      return longitude;'
,'   }'
,'   vec3  proc_env_map(float radius, vec3 Vdir, vec3 C1, vec3 C2, float azi_factor, float incl_factor) {'
,'      vec3 out_color = vec3(0.0, 0.0, 0.0);'
,'      vec3 P;'
,'      vec3 Pnoise;'
,'      float turb;'
,'      float in_azi, in_incl;'
,'      const float noise_z = 32.1113;'
,'      P = Vdir; // ignore radius, assume it is 1.0'
,'      in_azi = car2azi(P);'
,'      in_incl = car2incl(P, 1.0);'
,'      Pnoise.x = in_azi * azi_factor + -10.3333;'
,'      Pnoise.y = in_incl * incl_factor + 204.11;'
,'      Pnoise.z = noise_z;'
,'      turb = turbulence(Pnoise);'
,'      out_color = mix(C2, C1, (latamp(in_azi) + longamp(in_incl)) * 0.5);'
,'      return out_color;'
,'   }'
,'   vec3 gamma_encode(vec3 inclr, float gamma) {'
,'      vec3 r;'
,'      r = vec3(pow(inclr.x,gamma), pow(inclr.y,gamma), pow(inclr.z,gamma));'
,'      return r;'
,'   }'
,'   void main(void) {'
,'      const int numLights = 2;'
,'      const float specpow = 7.0;'
,'      vec3 light_color[numLights];'
,'      vec3 light_pt[numLights];'
,'      vec3 light_amp[numLights];  // amb, diff, spec'
,'      float diff_amp[numLights];'
,'      float spec_amp[numLights];'
,'      vec3  refl_dir[numLights];'
,'      light_color[0] = vec3(1., 1., 1.);'
,'      light_color[1] = vec3(1., 0.2, 0.2);'
,'      light_pt[0] = vec3(300.0, 100.0, 250.0);'
,'      light_pt[1] = vec3(-50.0, -50.0, -50.0);'
,'      light_amp[0] = vec3(0.05, 0.3, 0.0);'
,'      light_amp[1] = vec3(0.0, 0.1, 0.0);'
,'      //'
,'      float n_pole = 0.35;'
,'      float s_pole = 0.85;'
,'      vec3 eyept = vec3(0.0, 0.0, -100.0);'
,'      //'
,'      float mtime = time * 0.025;'
,'      float rad = car2radius(.03*vPosition);'
,'      float incl = car2incl(.03*vPosition, rad); // + sin(mod(time,3.14156)); '
,'      float azi = car2azi(.03*vPosition); //  + sin(mod(time,2.*3.14156));'
,'      float t1 = turbulence(vec3(azi*8.+51.0, incl*8.0+75.2, 251.444));'
,'      float t2 = turbulence(vec3(azi*3.0+101.33, incl*3.0-7777.22, 6251.444));'
,'      float t3 = pow(turbulence(.03*vPosition * 5.0), 5.0);'
,'      float t4 = pow(turbulence((vNormal + vec3(200.01, -500.444, 20444.3)) * .5), 3.0);'
,'      float lat_amp = latamp(azi + t2);'
,'      float long_amp = longamp(incl + t2);'
,'      //'
,'      vec3 ice_clr = vec3(0.8,0.8,1.);'
,'      vec3 cloud_clr = vec3(1.0, 1.0, 1.0);'
,'      vec3 ocean_clr = vec3(0.0, 0.0, 0.0);'
,'      vec3 ocean_clr_2 = vec3(0.2, 0.5, 0.2);'
,'      vec3 citylight_clr = vec3(0.5, 0.3, 0.2);'
,'      vec3 road_clr = vec3(0., 0., 0.);'
,'      vec3 land_clr  = vec3(1., .9, 1.);'
,'      vec3 line_clr = vec3(0.7, 0.3, 0.3);'
,'      vec3 specC1 = vec3(0.3, 0.3, 0.5);'
,'      vec3 specC2 = vec3(1.0, 1.0, 1.0);'
,'      vec3 atmos_clr = vec3(0.2, 0.35, 0.35);' 
,'      vec3 sun_clr = vec3(1.0, 1.0, 1.0);'
,'      vec3 black = vec3(0.0, 0.0, 0.0);'
,'      //'
,'      vec3 color = vec3(0.0,0.0,0.0);'
,'      float sum_amps = 0.0;'
,'      float cloud_amp = clamp(t3, 0.0, 1.0);'
,'      float fire_amp = clamp((lat_amp + long_amp) * t1 * 0.5, 0.0, 1.0);'
,'      if (incl <= 0.3 || incl >= (2.0*3.14159-0.3)) fire_amp = 0.0;'
,'      float ocean_amp = max(0.0, 1.0 - cloud_amp - fire_amp);'
,'      // color += line_clr * fire_amp;'
,'      color += ocean_clr * max(0.0, 1.0 - t3);'
,'      // color += cloud_clr * cloud_amp ;'
,'      // color += citylight_clr * max(0.0, fire_amp - cloud_amp);'
,'      // if (incl + (t1*0.1) < n_pole) color += ice_clr * clamp(t1 * 1.0, 0.0, 1.0);'
,'      vec3 new_vPosition = .03*vPosition + (vNormal * cloud_amp * 0.1); '
,'      //'
,'      vec3   out_color = vec3(0., 0., 0.);'
,'      float  out_alpha = 1.0;'
,'      vec3   lightdir, refldir, spec_color;'
,'      vec3   viewdir = normalize(eyept - new_vPosition);'
,'      float  horizon_amp = 1.0 - max(0.0, -dot(viewdir, normalize(vNormal)));' 
,'      horizon_amp = pow(horizon_amp, 7.0);'
,'      if (horizon_amp > 0.0) {'
,'         color += atmos_clr * horizon_amp;'
,'      }'
,'      for (int i = 0; i < numLights; i++) {'
,'         diff_amp[i] = max(0.0, dot(vNormal, normalize((light_pt[i]-.03*vPosition))));'
,'         // viewdir = normalize(eyept - vPosition);'
,'         lightdir = normalize(light_pt[i] - new_vPosition);'
,'         refl_dir[i] = normalize(reflect(lightdir, vNormal));'
,'         spec_amp[i] = pow(max(0., dot(viewdir, refl_dir[i])), specpow);'
,'         sum_amps += diff_amp[i] + spec_amp[i];'
,'      }'
,'      // if (incl <= pupil_size) color = pupil_clr;'
,'      // if (incl >= pupil_size && incl <= iris_size) {'
,'      //   color = mix(iris_clr, iris_clr_2, t1*t1);'
,'      //   if (incl >= iris_ring) color = mix(color, iris_ring_clr, 0.25+((incl-iris_ring)*10.));'
,'      // }'
,'      // if (incl > iris_size) color = sclera_clr;'
,'      // if (incl > iris_size && (lat_amp+long_amp) > 0.0) color = mix(color, blood_clr, t2 * 0.5);'
,'      for (int i = 0; i < numLights; i++) {'
,'         // spec_amp[i] *= (1.0 - fire_amp);'
,'         // spec_amp[i] *= (1.0 - cloud_amp);'
,'         spec_amp[i] *= (1.0 - t3);'
,'         spec_color = proc_env_map(1.0, refl_dir[i], specC1, sun_clr, 1.0, 1.0);' 
,'         out_color += (color * light_color[i] * light_amp[i].x) +'
,'            (color * light_color[i] * diff_amp[i] * light_amp[i].y) + (spec_color * light_color[i] * spec_amp[i] * light_amp[i].z);'
,'      }'
,'      // if (fire_amp > 0.0 && cloud_amp <= 0.2) out_color += citylight_clr * (max(0.0, fire_amp-cloud_amp));'
,'      if (horizon_amp > 0.0) {'
,'         // out_color += atmos_clr * horizon_amp;'
,'         // out_alpha *= (1.0 - horizon_amp);'
,'      }'
,'      out_color += vec3(t3, 0.0, 0.0);'
,'      out_color += citylight_clr * max(0.0, fire_amp * (t3 + 0.0) * 2.5);'
,'      // out_alpha = 1.0;'
,'      if (out_color == vec3(0.0, 0.0, 0.0)) out_color = vec3(0.0, 1.0, 0.0);'
,'      out_color = gamma_encode(clamp(out_color, 0.0, 1.0), 0.6);'
,'      gl_FragColor = vec4(out_color, clamp(out_alpha, 0.0, 1.0));'
,'   }'			       
].join("\n");

registerGlyph("xRedPlanet()",[
   makeOval(-1, -1, 2, 2, 32,PI/2,5*PI/2),                // OUTLINE PLANET CCW FROM TOP.
   [ [1, 1], [-1, -1]], 
]);

function xRedPlanet() {
   var sketch = addSphereShaderSketch(defaultVertexShader, xRedPlanetFragmentShader);
   sketch.code = [["xRedPlanet", xRedPlanetFragmentShader]];
   sketch.enableFragmentShaderEditing();
};


