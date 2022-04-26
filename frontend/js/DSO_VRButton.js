class VRButton {

  static createButton( renderer, options ) {
  
    let button = null;

    let defaults = {
      btnCls: 'view-vr-btn',
      btnCtr: 'collection-wrapper'
    };
  
    options = {
        ...defaults,
        ...options
    };

    let vrButtons = document.getElementsByClassName(options.btnCls);
    if(vrButtons[0]){
      button = vrButtons[0];
      console.log(button);
    } else {
      button = document.createElement( 'button' );
      button.textContent = 'View In VR';
      document.getElementById(options.btnCtr).append(button);
    };

    function showEnterVR( /*device*/ ) {

      let currentSession = null;

      async function onSessionStarted( session ) {
        console.log('session started');
        session.addEventListener( 'end', onSessionEnded );

       renderer.xr.setSession( session ).then(()=>{
         button.textContent = 'EXIT VR';

         currentSession = session;       
       })


      }

      function onSessionEnded( /*event*/ ) {

        currentSession.removeEventListener( 'end', onSessionEnded );

        button.textContent = 'ENTER VR';

        currentSession = null;

      }

      //

      button.style.display = 'inline-block';

//      button.textContent = 'ENTER VR';

      button.onmouseenter = function () {

        button.style.opacity = '1.0';

      };

      button.onmouseleave = function () {

        button.style.opacity = '0.5';

      };

      button.onclick = function () {
          console.log('click vr button');

        if ( currentSession === null ) {
          console.log('click vr button2');
          // WebXR's requestReferenceSpace only works if the corresponding feature
          // was requested at session creation time. For simplicity, just ask for
          // the interesting ones as optional features, but be aware that the
          // requestReferenceSpace call will fail if it turns out to be unavailable.
          // ('local' is always available for immersive sessions and doesn't need to
          // be requested separately.)

          const sessionInit = { optionalFeatures: [ 'local-floor', 'bounded-floor', 'hand-tracking', 'layers' ] };
          navigator.xr.requestSession( 'immersive-vr', sessionInit ).then( onSessionStarted );
          console.log('session requested');
        } else {
          console.log('click vr button: end session');

          currentSession.end();

        }

      };
console.log('onclick event added to vr button');
    }

    function disableButton() {

      button.style.display = '';

      button.style.cursor = 'auto';
      button.style.left = 'calc(50% - 75px)';
      button.style.width = '150px';

      button.onmouseenter = null;
      button.onmouseleave = null;

      button.onclick = null;

    }

    function showWebXRNotFound() {

      disableButton();

      button.textContent = 'VR NOT SUPPORTED';

    }

    function stylizeElement( element ) {

      element.style.position = 'absolute';
      element.style.bottom = '20px';
      element.style.padding = '12px 6px';
      element.style.border = '1px solid #fff';
      element.style.borderRadius = '4px';
      element.style.background = 'rgba(0,0,0,0.1)';
      element.style.color = '#fff';
      element.style.font = 'normal 13px sans-serif';
      element.style.textAlign = 'center';
      element.style.opacity = '0.5';
      element.style.outline = 'none';
      element.style.zIndex = '999';

    }

    if ( 'xr' in navigator ) {
      console.log('xr found in navigator');
      if(button){
        button.id = 'VRButton';
        button.style.display = 'none';

        //  stylizeElement( button );

        navigator.xr.isSessionSupported( 'immersive-vr' ).then( function ( supported ) {

        console.log('immersive-vr supported: ',supported);
        supported ? showEnterVR() : showWebXRNotFound();

        if ( supported && VRButton.xrSessionIsGranted ) {

          button.click();

        }

        } );

        return button;
      } else {
        console.log('button NOT found')
      }
      
    } else {
      console.log('xr NOT FOUND in navigator');

      const message = document.createElement( 'a' );

      if ( window.isSecureContext === false ) {

        message.href = document.location.href.replace( /^http:/, 'https:' );
        message.innerHTML = 'WEBXR NEEDS HTTPS'; // TODO Improve message

      } else {

        message.href = 'https://immersiveweb.dev/';
        message.innerHTML = 'WEBXR NOT AVAILABLE';

      }

      message.style.left = 'calc(50% - 90px)';
      message.style.width = '180px';
      message.style.textDecoration = 'none';

      stylizeElement( message );

      return message;

    }

  }

  static xrSessionIsGranted = false;

  static registerSessionGrantedListener() {

    if ( 'xr' in navigator ) {

      navigator.xr.addEventListener( 'sessiongranted', () => {

        VRButton.xrSessionIsGranted = true;

      } );

    }

  }

}

export { VRButton };