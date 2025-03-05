#define PI 3.14159
#define STEPS 100.
#define EPS 0.00001
#define EPSN 0.001
#define EPSOUT 0.004

float hash(vec3 p){
	return fract(123456.789 * sin(dot(p, vec3(12.34, 56.78, 91.01))));
}

mat2 rot(float a){
    float c = cos(a);
    float s = sin(a);
	return mat2(c, -s, s, c);
}

float smoothmin(float a, float b, float k){
	float f = clamp(0.5 + 0.5 * (a - b) / k, 0., 1.);
    return mix(a, b, f) - k * f * (1. - f);
}

float smoothmax(float a, float b, float k){
	return -smoothmin(-a, -b, k);
}

float smoothabs(float p, float k){
	return sqrt(p * p + k * k) - k;
}

float noise(vec3 p){
	vec3 f = fract(p);
    f = f * f * (3. - 2. * f);
    vec3 c = floor(p);
  
    return mix(mix(mix(hash(c), hash(c + vec3(1., 0., 0.)), f.x),
               	   mix(hash(c + vec3(0., 1., 0.)), hash(c + vec3(1., 1., 0.)), f.x),
               	   f.y),
               mix(mix(hash(c + vec3(0., 0., 1.)), hash(c + vec3(1., 0., 1.)), f.x),
               	   mix(hash(c + vec3(0., 1., 1.)), hash(c + vec3(1., 1., 1.)), f.x),
               	   f.y),
               f.z);  
}

float fbm(vec3 p){
	vec3 pos = 10. * p;
    float c = 0.5;
    float res = 0.;
    for(int i = 0; i < 4; i++){
        pos.xy = rot(2.) * pos.xy;
        pos = pos * 2. + 2.;
    	res += c * noise(pos);
        c /= 2.;
    }
    return res;
}


vec2 repeat(vec2 pos, float t){
	t = 2. * PI / t;
    float angle = mod(atan(pos.y, pos.x) , t) - 0.5 * t;
    float r = length(pos);
    return r * vec2(cos(angle), sin(angle));
}


float distScene(in vec3 pos, out int object, out float colorVariation){
    
    pos.yz = rot(0.5 + 0.25 * (0.5 + 0.5 * sin(0.25 * iTime - 0.5 * PI))) * pos.yz;
    pos.xz = rot(0.25 * iTime) * pos.xz;
    pos.y += 0.22;
    
    float f = noise(100. * pos);
    float sf = smoothstep(0.4, 0.5, f);
    
    //floor
    float dist = pos.y;
    object = 0;
    colorVariation = 0.;
    
    //pot
    vec3 p = pos;
    p.y -= 0.155;
    float distPot = length(p) - 0.2;
    distPot = smoothmax(distPot, p.y - 0.097, 0.01);
    distPot = smoothmax(distPot, -(length(p) - 0.18), 0.01);
    distPot = max(distPot, -(p.y + 0.15));
    dist = min(dist, distPot);
    
    if(dist == distPot){
        object = 1;
        float anglev = acos(p.y / 0.2);
        colorVariation = 0.9 * smoothstep(0.1, 0.2, 0.5 * sin(5. * sin(10. * anglev)) + 0.3 * (f - 0.5)) + 0.1 * sf;   
    }
    
    //ground
    float distGround = max(p.y - 0.06 + 0.01 * (noise(150. * p) - 0.5), length(p) - 0.18);
    dist = min(dist, distGround);
    
    if(dist == distGround){
        object = 2;
        colorVariation = 0.;
    }
    
    //anim
    pos.y *= 1. + 0.0075 * sin(5. * iTime);
    f = noise(100. * pos);
    sf = smoothstep(0.4, 0.5, f);
    
	//cactus
    p = pos;
    p.y -= 0.31;
    float radout = 0.1;
    float radin = 0.03;
    float distPlant = length(vec2(length(p.xz) - radin, p.y)) - radout;
    
    float angleh = atan(p.z, p.x); 
    float rh = length(p.xz);
    float t = 14.;
    float div = 2. * PI / t;
    float qh = floor(angleh / div);
    angleh += 0.15 * p.y / radout;
    angleh = mod(angleh, div) - 0.5 * div;
    
    p.x = rh * cos(angleh);
    p.z = rh * sin(angleh);
    
    distPlant -= 0.01 * (0.5 + 0.5 * cos(t * angleh));
    
   	vec3 pr = p - vec3(radin, 0., 0.);
    float anglev = atan(pr.y, pr.x);
    float att = abs(anglev);
    float rv = length(pr.xy);
    float qv = floor(anglev / (0.5 * div));
    anglev = mod(anglev, 0.5 * div) - 0.25 * div;
    p.x = rv * cos(anglev);
    p.y = rv * sin(anglev);
    
    p -= vec3(radout + 0.01, 0., 0.);
    float bumpRad = max(0.001, 0.005 - 0.0025 * att * att);
    distPlant = smoothmin(distPlant, length(p) - bumpRad, 0.008);
    
    vec3 pSpike = p - vec3(bumpRad, 0., 0.);
    pSpike.yz = rot(1.5 * hash(10. * vec3(qv, qh, t))) * pSpike.yz;
    pSpike = abs(pSpike);
    float spikeRad = 0.;//0.0015 - 0.001 * att * att;
    float distSpike = length(pSpike.yz) - spikeRad;
    pSpike.xz = rot(0.4 + 0.075 * sin(5. * iTime)) * pSpike.xz;
    pSpike.xy = rot(0.4 + 0.075 * sin(5. * iTime)) * pSpike.xy;
    distSpike = min(distSpike, length(pSpike.yz) - spikeRad);
    distSpike = 1.75 * smoothmax(distSpike, length(pSpike) - 0.0375 + 0.01 * att * att, 0.025);
    distPlant = min(distPlant, distSpike);
    
    dist = min(dist, distPlant);
    
    if(dist == distPlant){
        object = 3;
        colorVariation = cos(t * angleh) * cos(t * anglev) + 0.9 * (f - 0.5);
        colorVariation = 0.5 + 0.5 * (smoothstep(0.5, 0.9, colorVariation) - smoothstep(0.55, 0.95, -colorVariation));
        colorVariation = 0.8 * colorVariation + 0.2 * sf;
    }
    
    //flower
    p = pos;
    p.y -= 0.31 + radout + 0.005;
    
    vec3 pLayer = p;
    float radius = 0.075;
    float np = 7.;
    pLayer.xz = repeat(pLayer.xz, np);
    pLayer.xy = rot(0.99 - 0.01 * sin(5. * iTime)) * pLayer.xy;
    pLayer.y = abs(pLayer.y);
    pLayer.z = smoothabs(pLayer.z, 0.01);
    float distFlower = length(pLayer - vec3(0.4 * radius, -0.68 * radius, -0.67 * radius)) - radius;
    
    pLayer = p;
    pLayer.xz = rot(PI / np) * pLayer.xz;
    pLayer.xz = repeat(pLayer.xz, np);
    pLayer.xy = rot(0.7 - 0.01 * sin(5. * iTime)) * pLayer.xy;
    pLayer.y = abs(pLayer.y);
    pLayer.z = smoothabs(pLayer.z, 0.01);
    radius = 0.09;
    distFlower = 1.3 * min(distFlower, length(pLayer - vec3(0.4 * radius, -0.68 * radius, -0.67 * radius)) - radius);
    
    dist = min(dist, distFlower);
    if(dist == distFlower){
    	object = 4;
        colorVariation = smoothstep(0., 0.75, length(pLayer / radius));
    }
               
    return 0.5 * dist;
}

vec3 getNormal(vec3 p){
    float c;
    int o;
	return normalize(vec3(distScene(p + vec3(EPSN, 0., 0.), o, c) - distScene(p - vec3(EPSN, 0., 0.), o, c),
    					  distScene(p + vec3(0., EPSN, 0.), o, c) - distScene(p - vec3(0., EPSN, 0.), o, c),
                          distScene(p + vec3(0., 0., EPSN), o, c) - distScene(p - vec3(0., 0., EPSN), o, c)));
}

vec3 render(vec2 uv){
    
    vec3 inkColor = vec3(0.15, 0.25, 0.4);
    vec3 col = inkColor;
    
    //raymarch
    vec3 eye = vec3(0., 0., 5);
    vec3 ray = normalize(vec3(uv, 1.) - eye);
    int o;
    float dist, step, c, prevDist;
    bool hit = false;
    vec3 pos = eye;
    dist = distScene(pos, o, c);
    float outline = 1.;
    
    for(step = 0.; step < STEPS; step++){
        prevDist = dist;
    	dist = distScene(pos, o, c);
        if(dist > prevDist + EPS && dist < EPSOUT ){
        	outline = min(outline, dist);
        }
        if(abs(dist) < EPS){
        	hit = true;
            break;
        }
    	pos += dist * ray;
    }
    outline /= EPSOUT;
    
    vec3 normal = getNormal(pos);
    float f = fbm(pos);
    
    //shading
    if(hit){
    	vec3 light = vec3(10., 5., 5.);
        light.yz = rot(0.5) * light.yz;
        float shine = 30.;
        
        //paper
        if(o == 0) col = 1. - 0.025 * vec3(smoothstep(0.6, 0.2, fbm(vec3(uv * 6.,1.))));
        //pot
        if(o == 1) col = mix(vec3(0.63, 0.63, 0.85), vec3(1.), 0.8 * c);
        if(o == 2) col = vec3(0.6, 0.6, 0.6);
        //plant
        if(o == 3){
            col = mix(vec3(0.3, 0.7, 0.6),vec3(0.85, 0.95, 0.7), c);
			shine = 5.;
        }
        //flower
        if(o == 4){
        	col = mix(vec3(0.85, 0.95, 0.7), vec3(0.96, 0.6, 0.85), c);
            shine = 5.;
        }
        
        //diffuse
        vec3 l = normalize(light - pos);
        float diff = dot(normalize(normal + 0.2 * vec3(f - 0.5)), l);
        diff = smoothstep(0.4, 0.5, diff + 0.3 * f);
        if(o != 0) col = mix(col, vec3(0.1, 0.3, 0.75), 0.3 * (1. - diff));
        
        //specular
        vec3 refl = reflect(-l, normal);
        float spec = pow(dot(normalize(eye - pos), refl), shine);
        spec = smoothstep(0.5, 0.6, spec + 0.5 * f);
        col += 0.01 * shine * spec;
        
        //outline
        outline = smoothstep(0.75, 0.95, outline + 0.9 * f);
        col = mix(inkColor, col, outline);
    }  
    return col;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.x;
    uv *= 0.8;
    vec3 col = render(uv);
    fragColor = vec4(col,1.0);
}