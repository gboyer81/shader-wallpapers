export type Theme = "dark" | "light";

export interface Wallpaper {
  name: string;
  /** Theme of the switcher pill drawn over this wallpaper. */
  theme: Theme;
  /** Fragment shader body; prepended with HEAD. */
  src: string;
}

/** Number of click ripples kept in the C[] uniform ring buffer. */
export const MAX_CLICKS = 8;

export const VERTEX = `#version 300 es
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0,1);}`;

/**
 * Shared prelude. Uniforms:
 *  R  – framebuffer size in px
 *  T  – seconds since start
 *  M  – smoothed pointer, aspect-corrected (height = 1, origin at centre)
 *  C  – recent clicks: xy position, z start time
 *  Look – user grade: x hue (radians), y saturation, z brightness, w grain
 *  Vig  – vignette strength multiplier (1 = as designed)
 */
export const HEAD = `#version 300 es
precision highp float;
uniform vec2 R;uniform float T;uniform vec2 M;uniform vec3 C[${MAX_CLICKS}];uniform vec4 Look;uniform float Vig;
out vec4 O;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+1.),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 r=mat2(.8,.6,-.6,.8);for(int i=0;i<5;i++){v+=a*noise(p);p=r*p*2.02;a*=.5;}return v;}
vec2 P(){return (gl_FragCoord.xy-.5*R)/R.y;}
float ring(vec2 p,float spd,float w){float s=0.;for(int i=0;i<${MAX_CLICKS};i++){float a=T-C[i].z;if(a<0.||a>5.)continue;float d=length(p-C[i].xy);s+=exp(-pow((d-a*spd)*w,2.))*exp(-a*1.);}return s;}
float grain(){return (hash(gl_FragCoord.xy+fract(T*7.)*100.)-.5)*.016;}
vec4 finish(vec3 c){
if(Look.x!=0.){const vec3 k=vec3(.57735);float cs=cos(Look.x),sn=sin(Look.x);c=c*cs+cross(k,c)*sn+k*dot(k,c)*(1.-cs);}
c=mix(vec3(dot(c,vec3(.2126,.7152,.0722))),c,Look.y);
c*=Look.z;
return vec4(c+grain()*Look.w,1);}
`;

export const WALLPAPERS: Wallpaper[] = [
  {
    name: "Drift",
    theme: "dark",
    src: `
void main(){vec2 p=P();vec2 d=p-M;float l=length(d);
float rp=ring(p,.5,8.);
vec2 q=p*1.1-d*.3*exp(-l*l*6.);
float t=T*.03;
vec2 w=vec2(fbm(q*1.3+vec2(0,t)),fbm(q*1.3+vec2(5.2,1.3)-t));
float f=fbm(q*1.2+w*1.8+rp*.35+t*.5);
vec3 col=mix(vec3(.035,.04,.065),vec3(.09,.22,.27),smoothstep(.2,.8,f));
col=mix(col,vec3(.28,.2,.42),smoothstep(.4,.9,w.x)*.6);
col+=vec3(.75,.55,.5)*pow(smoothstep(.55,.95,f),3.)*.25;
col+=vec3(.5,.6,.8)*exp(-l*3.5)*.07;
col+=vec3(.6,.7,.9)*rp*.1;
col*=1.-Vig*.35*dot(p*.6,p*.6);
O=finish(col);}`,
  },
  {
    name: "Lattice",
    theme: "light",
    src: `
void main(){vec2 p=P();vec2 d=p-M;float lens=exp(-dot(d,d)*10.);
vec2 g=p-d*lens*.45;
float rp=0.;vec2 rd=vec2(0);
for(int i=0;i<${MAX_CLICKS};i++){float a=T-C[i].z;if(a<0.||a>4.)continue;vec2 cd=p-C[i].xy;float cl=length(cd);float k=exp(-pow((cl-a*.5)*9.,2.))*exp(-a*1.1);rp+=k;rd+=cd/(cl+1e-4)*k;}
g-=rd*.025;
float s=34.;vec2 gs=g*s;vec2 id=floor(gs);vec2 cell=fract(gs)-.5;
float n=noise(id*.15+T*.15);
float r=.07+.1*lens+.12*min(rp,1.)+.03*n;
float px=s*1.2/R.y;
float dt=1.-smoothstep(r-px,r+px,length(cell));
vec3 bg=vec3(.925,.925,.915)-.025*lens;
vec3 ink=mix(vec3(.64,.64,.62),vec3(.25,.38,.92),clamp(lens*.85+rp,0.,1.));
vec3 col=mix(bg,ink,dt);
col*=1.-Vig*.08*dot(p,p);
O=finish(col);}`,
  },
  {
    name: "Contour",
    theme: "dark",
    src: `
void main(){vec2 p=P();vec2 d=p-M;float g=exp(-dot(d,d)*6.);
float h=fbm(p*1.3+vec2(T*.015,-T*.01));
h+=.28*exp(-dot(d,d)*7.);
h+=ring(p,.4,7.)*.035;
float L=h*16.;float fw=fwidth(L);
float line=1.-smoothstep(0.,fw*1.2,abs(fract(L+.5)-.5));
float major=1.-smoothstep(0.,fw*1.8,abs(fract(L/5.+.5)-.5)*5.);
vec3 col=vec3(.075,.07,.066);
col+=vec3(.55,.49,.43)*(line*.22+major*.3)*(1.+g*1.4);
col+=vec3(.95,.55,.35)*max(line,major)*g*.22;
col*=1.-Vig*.3*dot(p*.6,p*.6);
O=finish(col);}`,
  },
  {
    name: "Glass",
    theme: "dark",
    src: `
vec3 scene(vec2 q){vec3 s=vec3(.055,.055,.07);
vec2 b1=vec2(sin(T*.07)*.6,cos(T*.05)*.3),b2=vec2(cos(T*.06+2.)*.7,sin(T*.08+1.)*.35);
s+=vec3(.9,.45,.35)*exp(-length(q-b1)*2.5)*.33;
s+=vec3(.25,.4,.9)*exp(-length(q-b2)*2.2)*.33;
s+=vec3(1,.95,.9)*exp(-length(q-M)*5.)*.42;
return s;}
void main(){vec2 p=P();float rp=ring(p,.5,8.);
float rib=fract(p.x*22.)-.5;
float bend=rib*(.09+rp*.18);
vec3 col=vec3(scene(vec2(p.x+bend*.85,p.y)).r,scene(vec2(p.x+bend,p.y)).g,scene(vec2(p.x+bend*1.15,p.y)).b);
float e=pow(abs(rib)*2.,14.);
col*=.93+.07*cos(rib*6.2832);
col+=e*(.025+exp(-length(p-M)*3.)*.09);
col*=1.-Vig*.25*dot(p*.6,p*.6);
O=finish(col);}`,
  },
  {
    name: "Liquid",
    theme: "light",
    src: `
float field(vec2 p){float f=0.;
for(int i=0;i<5;i++){float fi=float(i);vec2 c=vec2(sin(T*.11*(1.+fi*.3)+fi*2.)*.62,cos(T*.09*(1.+fi*.2)+fi*1.3)*.32);float r=.075+.018*fi;vec2 e=p-c;f+=r*r/(dot(e,e)+1e-4);}
vec2 e=p-M;f+=.0121/(dot(e,e)+1e-4);
for(int i=0;i<${MAX_CLICKS};i++){float a=T-C[i].z;if(a<0.||a>7.)continue;float r=.12*smoothstep(0.,.5,a)*(1.-smoothstep(3.5,7.,a));vec2 k=p-C[i].xy-vec2(0,a*.025);f+=r*r/(dot(k,k)+1e-4);}
return f;}
void main(){vec2 p=P();float f=field(p);float fw=fwidth(f);
float edge=smoothstep(1.-fw,1.+fw,f);
float inner=smoothstep(1.,4.,f);
vec3 bg=vec3(.91,.915,.93)-.06*smoothstep(.25,1.,f)*(1.-edge);
vec2 dm=p-M;float near=exp(-dot(dm,dm)*8.);
vec3 blob=mix(vec3(.24,.25,.31),vec3(.13,.14,.18),inner);
blob=mix(blob,vec3(.2,.3,.62),near*.35*(1.-inner));
blob+=.12*(1.-smoothstep(1.,1.5,f));
vec3 col=mix(bg,blob,edge);
col*=1.-Vig*.06*dot(p,p);
O=finish(col);}`,
  },
];
