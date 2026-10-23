/* One continuous ocean, cloud and aircraft scene. */
(() => {
  const clamp = n => Math.max(0, Math.min(1, n));
  const range = (p, a, b) => clamp((p - a) / (b - a));
  const ease = n => n * n * (3 - 2 * n);
  const mix = (a, b, n) => a + (b - a) * n;
  class OceanSurface {
    constructor(canvas, image, reduced) {
      this.canvas = canvas; this.reduced = reduced;
      const gl = canvas.getContext('webgl', {alpha: false, antialias: false, powerPreference: 'high-performance'});
      if (!gl) return;
      this.gl = gl;
      const vertex = `attribute vec2 position; varying vec2 uv; void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
      const fragment = `precision highp float;
        varying vec2 uv; uniform sampler2D ocean; uniform vec2 resolution;
        uniform float time; uniform vec4 ship;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
        float waves(vec2 p){return sin(p.x*32.+p.y*19.+time*.85)*.42
          +sin(p.x*59.-p.y*41.-time*1.1)*.22
          +sin(p.x*113.+p.y*78.+time*1.7)*.09
          +noise(p*88.+vec2(time*.15,-time*.22))*.19;}
        vec2 mirror(vec2 p){return 1.-abs(mod(p,2.)-1.);}
        void main(){
          vec2 st=vec2(uv.x,1.-uv.y), p=st*vec2(resolution.x/resolution.y,1.);
          float level=waves(p); float dx=waves(p+vec2(.002,0))-level;
          float dy=waves(p+vec2(0,.002))-level;
          vec2 flow=vec2(dx,dy)*.045;
          vec2 tex=vec2(st.x*.82,st.y*.48)+vec2(time*.0013,-time*.006);
          vec3 color=texture2D(ocean,mirror(tex+flow)).rgb;
          vec3 detail=texture2D(ocean,mirror(tex*1.61+vec2(-time*.002,time*.004)+flow*.7)).rgb;
          color=mix(color,detail,.20)*vec3(.82,1.04,1.13);
          vec3 normal=normalize(vec3(-dx*6.,-dy*6.,1.));
          float light=pow(max(dot(normal,normalize(vec3(-.30,-.42,1.))),0.),34.);
          float glitter=smoothstep(.64,.90,noise(p*260.+flow*30.+vec2(0.,-time*.6)));
          float reflection=exp(-pow((st.x-.58)*2.8,2.));
          color+=vec3(.27,.38,.47)*light*(.07+glitter*.55)*reflection;
          float behind=ship.y-ship.w*.5-st.y;
          float lateral=abs(st.x-ship.x), width=ship.z+max(behind,0.)*.17;
          float grain=noise(vec2(st.x*350.,st.y*240.+time*4.));
          float trail=exp(-pow(lateral/max(width,.001),2.)*2.7)*exp(-max(behind,0.)*2.5);
          float edges=exp(-pow((lateral-width*.82)/max(.003,width*.15),2.));
          float churn=.35+.65*noise(vec2(st.x*140.,st.y*115.+time*2.));
          float wake=(trail*churn*.45+edges*grain*.55)*smoothstep(-.015,.03,behind);
          float hull=exp(-pow((lateral-ship.z)/.006,2.))*(1.-smoothstep(ship.w*.42,ship.w*.56,abs(st.y-ship.y)));
          float bow=exp(-pow((length(vec2((st.x-ship.x)*.9,st.y-(ship.y+ship.w*.44)))-ship.z)/.006,2.));
          color=mix(color,vec3(.70,.86,.91),clamp(wake+hull*grain*.32+bow*grain*.24,0.,.72));
          color*=1.-.15*length(st-.5);gl_FragColor=vec4(color,1.);
        }`;
      try {
        const compile = (type, source) => { const shader=gl.createShader(type); gl.shaderSource(shader,source); gl.compileShader(shader);
          if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader)); return shader; };
        this.program=gl.createProgram(); gl.attachShader(this.program,compile(gl.VERTEX_SHADER,vertex)); gl.attachShader(this.program,compile(gl.FRAGMENT_SHADER,fragment)); gl.linkProgram(this.program);
        if(!gl.getProgramParameter(this.program,gl.LINK_STATUS)) throw new Error('Ocean shader linking failed');
        gl.useProgram(this.program); const buffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
        const position=gl.getAttribLocation(this.program,'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
        this.uniforms=Object.fromEntries(['resolution','time','ship'].map(name=>[name,gl.getUniformLocation(this.program,name)]));
        const texture=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        const upload=()=>{gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);this.ready=true;canvas.style.opacity='1';image.style.animation='none';};
        if(image.complete&&image.naturalWidth)upload();else image.addEventListener('load',upload,{once:true});
        canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.ready=false;canvas.style.opacity='0';});
      } catch(error) { console.warn('Ocean uses its photo fallback:',error.message); canvas.style.display='none'; }
    }
    resize(w,h){if(!this.gl)return; const scale=Math.min(devicePixelRatio||1,1.25,1600/w);this.canvas.width=w*scale;this.canvas.height=h*scale;this.gl.viewport(0,0,this.canvas.width,this.canvas.height);}
    draw(t,ship){if(!this.ready)return;const gl=this.gl; gl.useProgram(this.program);gl.uniform2f(this.uniforms.resolution,this.canvas.width,this.canvas.height);
      gl.uniform1f(this.uniforms.time,this.reduced?0:t*.001);gl.uniform4f(this.uniforms.ship,...ship);gl.drawArrays(gl.TRIANGLES,0,6);}
  }
  window.SeaAirJourney=class {
    constructor(section,reduced){
      this.section=section;this.reduced=reduced;this.pin=section.querySelector('.sea-air-pin');
      this.sea=section.querySelector('.sea-layer');this.ship=section.querySelector('.freight-ship');
      this.title=section.querySelector('.ocean-heading');this.reasons=section.querySelector('.ocean-reasons');
      this.sky=section.querySelector('.sky-layer');this.plane=section.querySelector('.airplane');this.clouds=[...section.querySelectorAll('.journey-cloud')];
      this.water=new OceanSurface(section.querySelector('.ocean-surface'),section.querySelector('.ocean-texture'),reduced);
      this.p=null;this.last=0;this.resize();
    }
    resize(){
      this.w=this.pin.clientWidth;this.h=innerHeight;this.mobile=this.w<768;this.water.resize(this.w,this.h);
      this.shipBaseHeight=this.h*2.5;
      this.ship.style.height=this.shipBaseHeight+'px';this.ship.style.width=this.shipBaseHeight*731/3579+'px';
      this.planeWidth=this.w*(this.mobile?1.7:1.20);
      this.plane.style.width=this.planeWidth+'px';this.plane.style.height=this.planeWidth*2211/2221+'px';
      for(const cloud of this.clouds)cloud.style.width=(this.mobile?1.6:1.05)*this.w+'px';
    }
    update(t, bounds=this.section.getBoundingClientRect(), sectionHeight=this.section.offsetHeight){
      if(bounds.top>this.h||bounds.bottom<0)return;
      if(this.reduced){this.water.draw(0,[.5,.5,.035,.34]);return;}
      const target=clamp(-bounds.top/(sectionHeight-this.h));
      const dt=Math.min(64,t-(this.last||t));this.last=t;
      this.p=this.p===null||bounds.top>=0?target:mix(this.p,target,1-Math.exp(-dt/125));
      if(Math.abs(this.p-target)<.00002)this.p=target;
      const p=this.p,w=this.w,h=this.h;
      const pullback=ease(range(p,.08,this.mobile?.34:.46)), ascent=ease(range(p,.55,.74));
      const shipHeight=mix(h*2.5,h*(this.mobile?.40:.48),pullback)*(1-ascent*.28);
      const afloat=ease(range(p,0,.08));
      const bobX=Math.sin(t*.00061)*2.2*afloat,bobY=Math.sin(t*.00083)*3*afloat;
      // During the upward reveal, hold the ship's central white container at the
      // truck cargo's screen position; only the road/water boundary moves.
      const centerX=w*.5+bobX,centerY=h*(.5+.03*afloat)+bobY-Math.max(0,bounds.top);
      this.ship.style.transform=`translate3d(${centerX}px,${centerY}px,0) translate(-50%,-50%) rotate(${Math.sin(t*.00039)*.22*afloat}deg) scale(${shipHeight/this.shipBaseHeight})`;
      this.sea.style.opacity=1-ease(range(p,.77,.89));
      if(p<.90)this.water.draw(t,[centerX/w,centerY/h,shipHeight*731/3579/w*.45,shipHeight/h]);
      this.title.style.opacity=ease(range(p,0,.035))*(1-ease(range(p,.08,.18)));this.title.style.transform=`translateY(${-range(p,.05,.20)*80}px)`;
      const reasonsOpacity=ease(range(p,.20,.34))*(1-ease(range(p,.58,.67)));
      this.reasons.style.opacity=reasonsOpacity;this.reasons.style.transform=`translateY(${(1-ease(range(p,.20,.34)))*70}px)`;
      this.reasons.inert=reasonsOpacity<.05;
      this.sky.style.opacity=ease(range(p,.76,.90));
      const cover=ease(range(p,.55,.73)), clear=ease(range(p,.77,.97));
      this.clouds.forEach((cloud,i)=>{
        const front=i>=6, col=i%3, row=Math.floor((i%6)/3);
        const finalX=[-.18,.30,.78][col]*w, finalY=(row? .42:-.24)*h;
        const incomingX=(col-1)*w*.48*(1-cover), incomingY=(row?1:-1)*h*.35*(1-cover);
        const drift=Math.sin(t*.00012+i)*8;
        const x=finalX+incomingX-clear*w*(front?.6:.18)+drift;
        const y=finalY+incomingY-clear*h*(front?-.75:.48);
        const scale=mix(1.65,1,cover)+clear*.22;
        cloud.style.transform=`translate3d(${x}px,${y}px,0) scale(${scale}) rotate(${i%2?-8:7}deg)`;
        cloud.style.opacity=(front?.58:.87)*cover*(1-ease(range(p,front?.88:.83,1)));
      });
      // The plane crosses the SAME cloud bank while the ship is still visible underneath.
      const flight=ease(range(p,.70,1));
      const planeWidth=this.planeWidth;
      this.plane.style.transform=`translate3d(${mix(-planeWidth*.55,w+planeWidth*.42,flight)}px,${h*.49}px,0) translate(-50%,-50%) rotate(${-3+flight*5}deg)`;
      this.plane.style.opacity=ease(range(p,.69,.73));
      this.section.dataset.phase=p<.55?'ocean':p<.70?'cloud-ascent':p<.90?'ship-plane-overlap':'flight';
      this.section.dataset.progress=p.toFixed(4);
    }
  };
})();
