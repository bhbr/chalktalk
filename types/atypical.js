"use strict";

(function(){
function AtypicalModuleGenerator() {
   var AT = {};

   // This internal variable holds all of our types, with keys being their names and values
   // being their constructors.
   var _types = {};

   // This internal variable holds all our generic types, with keys being their names and values
   // being their metaconstructor functions (i.e. functions that return constructors).
   var _genericTypes = {};

   // This internal variable will hold all our conversion functions, in the following structure:
   // {
   //     typename_converted_from: {
   //         typename_converted_to_1: function(value) {...}
   //         typename_converted_to_2: function(value) {...}
   //         ...
   //     }
   //     ...
   // }
   var _conversions = {};

   var _intermediaryConversionsToAnyDestination = {}; // TODO: DOC
   var _intermediaryConversionsFromAnySource = {}; // TODO: DOC

   // Utility function to get the type name from a variable when you don't know whether they're
   // strings or constructor functions.
   //
   // constructorOrName: Either a function (returns its name), or a string (returns the string
   //                    unchanged). If any other value (e.g. null) is passed in, this function
   //                    just returns the input.
   function _typename(constructorOrName) {
      if (typeof constructorOrName === "function") {
         return constructorOrName.name;
      }
      else {
         return constructorOrName;
      }
   }
   
   // Internal function for checking whether a type is a concrete subtype of a generic type.
   function _isGenericType(type) {
      return typeof type.prototype.genericType === "function";
   }

   // Convenience function. Returns true iff func is a function that takes in exactly n arguments.
   function _isFunctionOfNArguments(func, n) {
      return typeof func === "function" && func.length === n;
   }
   
   // Base for all types. Contains some common functionality needed in all of them.
   AT.Type = function() {};
   AT.Type.prototype = {
      // Converts this object to another type, returning the converted object or undefined
      // if no conversion exists.
      //
      // type: Name or constructor of the destination type. Must be a type that's already been
      //       defined.
      convert: function(type) {
         let typename = _typename(type);
         type = AT.typeNamed(typename);
         if (!AT.typeIsDefined(type)) {
            console.error("Type " + typename + " not defined.");
            return undefined;
         }
         if (type === this.type) {
            return this;
         }

         var conversionFunction = _conversionFunction(this.type, type);
         if (conversionFunction === undefined) { return undefined; }
         else { return conversionFunction(this); }
      },

      // Checks whether a conversion function between this object and another type exists.
      //
      // typename: Name or constructor of the type you want to convert to. Must be a type that's
      //           already been defined.
      canConvert: function(type) {
         return AT.canConvert(this.type, type);
      },

      // Returns whether or not this object is of a primitive type. Types are considered to be
      // primitive if they have a "toPrimitive" function in their definition.
      isPrimitive: function() {
         return AT.isPrimitive(this.type);
      },

      // Helper function for defining an immutable property on this object.
      // Meant to be used primarily in initializers, and not anywhere else.
      //
      // propertyName: A string containing the desired name of the property.
      // value: The value you want it to have. This cannot be changed later.
      _def: function(propertyName, value) {
         if (typeof propertyName !== "string") {
            console.error(
               "Attempted to define a property with non-string name ("+propertyName+")");
            return;
         }
         Object.defineProperty(this, propertyName, {value: value, writeable: false});
      }
   };

   // Checks whether a type with the given name is already defined.
   // 
   // type: The name or constructor of the type you want to check for.
   AT.typeIsDefined = function(type) {
      let typename = _typename(type);
      return typeof(typename) === "string" && _types.hasOwnProperty(typename);
   };

   // Returns whether or not this type is a primitive type. Types are considered to be
   // primitive if they have a "toPrimitive" function in their definition.
   //
   // type: The name or constructor for the type that you wish to check. Should be an Atypical
   //       type name that has already been defined. If not, returns false.
   AT.isPrimitive = function(type) {
      let typename = _typename(type);
      return (AT.typeIsDefined(type)
         && typeof _types[typename].prototype.toPrimitive === "function");
   };

   // Returns the constructor function for the given type.
   //
   // typename: The name of the type you want the function for. Should be the string name of an
   //           Atypical type that has already been defined. If not, returns undefined.
   AT.typeNamed = function(typename) {
      if (typeof typename !== "string" && !AT.typeIsDefined(typename)) {
         return undefined;
      }
      return _types[typename];
   };

   // Checks whether you can convert from one type to another.
   //
   // sourceType: The name or constructor of the type you'd like to convert from.
   //             Must be already defined.
   // destinationType: The name or constructor of the type you'd like to convert from.
   //                  Must be already defined.
   AT.canConvert = function(sourceType, destinationType) {
      return _conversionFunction(sourceType, destinationType) !== undefined;
   };

   // TODO: doc
   function _conversionFunction(sourceType, destinationType) {
      let sourceTypename = _typename(sourceType);
      let destinationTypename = _typename(destinationType);

      if (sourceTypename === destinationTypename) {
         // Same types, return the identity function
         return function(x) { return x; }
      }

      // Explicitly-defined conversions override everything else
      if (_conversions[sourceTypename][destinationTypename] !== undefined) {
         return _conversions[sourceTypename][destinationTypename];
      }

      sourceType = AT.typeNamed(sourceTypename);
      destinationType = AT.typeNamed(destinationTypename);

      // Generic types have special rules for conversions

      if (_isGenericType(sourceType) && _isGenericType(destinationType)) {

         // Do some special processing for conversions between two types with the same generic type
         if (sourceType.prototype.genericType === destinationType.prototype.genericType) {

            // Can't convert if no conversion function exists.
            if (!sourceType.prototype.changeTypeParameters) { return undefined; }

            // Can't convert if there's a differing number of type parameters
            if (sourceType.prototype.typeParameters.length
               !== destinationType.prototype.typeParameters.length)
            {
               return undefined;
            }

            // Can't convert if any of the type parameters are not convertible
            for (let i = 0; i < sourceType.prototype.typeParameters.length; i++) {
               if (!AT.canConvert(sourceType.prototype.typeParameters[i],
                  destinationType.prototype.typeParameters[i]))
               {
                  return undefined;
               }
            }

            return function(sourceValue) {
               return sourceValue.changeTypeParameters(destinationType.prototype.typeParameters);
            }
         }
         else {
            // TODO: add conversions between different generic types
            return undefined;
         }
      }

      return undefined;
   };

   function _validateTypename(typename) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(typename)) {
         console.error("Typename must follow Javascript identifier syntax, and must not contain "
            + "a dollar sign.");
         return false;
      }
      if (AT.typeIsDefined(typename)) {
         console.error("A type with the name " + typename + " is already defined.");
         return false;
      }
      if (AT[typename] !== undefined) {
         console.error("Cannot define a type with the name " + typename
            + ", as it overlaps with an existing property of the AT object.");
         return false;
      }
      return true;
   }

   // Function to build an Atypical type. Sets up the correct prototype, the required functions,
   // and so on, returning the constructor function for that type, or undefined if the type
   // definition fails. Also adds the constructor function to the AT object, so that you can access
   // it with AT.YourTypeNameHere.
   //
   // implementation: An object containing the implementation details of the type. 
   //
   //                 The following properties MUST be defined on this object:
   //
   //                 typename: A string containing the name of the type. Must be unique and
   //                           follow Javascript identifier syntax, must not contain a dollar sign,
   //                           and must be a type name that has not already been defined and does
   //                           not overlap with any existing functions or variables on the AT
   //                           object (e.g. hasOwnProperty, defineType).
   //
   //                           This property will NOT be copied to objects of this type. To access
   //                           the typename of an object, use object.type.name.
   //
   //                 init: Initialization function. Should take the same arguments as your
   //                       constructor and handle all initialization logic. Should also do any
   //                       required validation of the arguments and throw a ConstructionError if
   //                       incorrect arguments are provided.
   //
   //                 The following properties MAY be defined on this object:
   //
   //                 toPrimitive: Should be a function that returns a simple, unwrapped Javascript
   //                              object that is equivalent to this type. (E.g. the Float type can
   //                              simply return a Javascript float). Types that define this 
   //                              function are considered to be "primitive types", and are given 
   //                              some special treatment. They should have an init function of one
   //                               argument that allows you to convert these primitive JS values
   //                               back into Atypical objects.
   //
   //                 The following properties MUST NOT be defined on this object:
   //
   //                 type: This property will be set to the type constructor for this type. Any
   //                       custom value will be overridden.
   //
   //                 genericType: This property is reserved for sub-types of generic types only.
   //
   //                 Also be careful to avoid name collisions with AT.Type convenience functions,
   //                 such as "convert", "canConvert", etc.
   //                 
   //                 This object may also contain any other functions and elements that are
   //                 required for this type.
   AT.defineType = function(implementation) {
      if (typeof implementation.init !== "function") {
         console.error("Initialization function is required when creating a new type.");
         return undefined;
      }
      if (typeof implementation.typename !== "string") {
         console.error("Typename string is required when creating a new type.");
         return undefined;
      }
      if (!(typeof implementation.genericType === "function"
         || _validateTypename(implementation.typename)))
      {
         return undefined;
      }

      // For reasons I don't entirely understand, doing something like this:
      //
      //     var AtypicalType = function() {
      //         this.init.apply(this, arguments);
      //     }
      //     
      // And then returning AtypicalType at the end of the function, ends up making the
      // Chrome developer tools infer the name of EVERY SINGLE TYPE defined using this
      // function as "AtypicalType", leaving you debugging monstrosities like this in
      // the console:
      // 
      //     AtypicalType {x: AtypicalType, y: AtypicalType, z: AtypicalType}
      //
      // So I'm making a deal with the devil and using "eval" instead. Below, we set 
      // AtypicalType to a function like this:
      //
      //     function typename() {
      //         this.init.apply(this, arguments);
      //     }
      //     
      // This causes the Chrome dev tools to pick up the typename as the actual display name
      // of the type, which is much better:
      //
      //     Vector3 {x: Float, y: Float, z: Float}
      // 
      // It also should set the .name property of the constructor to the name of the type as well,
      // in a way that is hopefully cross-browser supported. This allows us to go from the
      // constructor function to the name of the type easily.
      // 
      // Restricting the typename as I did above should keep this from being used for
      // too much evil.
      // Bless me father, for I have sinned.
      var AtypicalType = eval("(function() {\n" +
         "var func = function " + implementation.typename + "() {\n" +
            "this.init.apply(this, arguments);\n" +
         "};\n" +
         "return func;" +
      "})()");

      var proto = Object.create(AT.Type.prototype);

      for (var element in implementation) {
         if (element !== "typename") {
            proto[element] = implementation[element];
         }
      }
      proto.type = AtypicalType;

      AtypicalType.prototype = proto;

      _types[implementation.typename] = AtypicalType;
      
      // Initialize conversion metadata
      _conversions[implementation.typename] = {};
      _intermediaryConversionsFromAnySource[implementation.typename] = [];
      _intermediaryConversionsToAnyDestination[implementation.typename] = [];

      AT[implementation.typename] = AtypicalType;

      return AtypicalType;
   };

   // This function, when called, registers a generic type with Atypical. Unlike the AT.defineType
   // function, which returns a constructor (and puts that constructor in the AT module),
   // this function returns (and adds to the AT object) a metaconstructor, a function that RETURNS
   // constructor functions when given one or more types as arguments. For example:
   //
   // AT.defineGenericType({ typename: "Pair", ... });
   // let floatIntValue = new (AT.Pair(AT.Float, AT.Int))(5.6, 7);
   //
   // (Unfortunately, the extra parentheses are required due to JS syntax limitations.
   //  One way around that is to assign the returned constructor to a variable,
   //  e.g. let FloatIntPair = AT.Pair(AT.Float, AT.Int))
   //  
   // implementation: An object describing the implementation details of the generic type. Any
   //                 properties added to this object, except the special properties described
   //                 below, will be set as properties of every object of every instance of this
   //                 generic type.
   //
   //                 The following properties MUST be defined on this object:
   //                 
   //                 typename: The name of the generic type as a string.
   //                           This must be a valid JS identifier and must not contain a dollar
   //                           sign. In addition, this must not be the same as any previously-
   //                           defined types or any existing properties of the AT object
   //                           (e.g. "hasOwnProperty", "defineType", etc.), as the metaconstructor
   //                           will be added to the AT object under this name.
   //                           Typenames for all concrete subtypes of this generic type will be
   //                           auto-generated based on this name and the names of the type
   //                           parameters.
   //
   //                 init: This is the initialization function for all concrete subtypes of this
   //                       generic type. To access the type parameters, use the
   //                       this.typeParameters property, as it will be set to an array of the type
   //                       parameters each concrete subtype was created with.
   //
   //                 The following properties MAY be defined on this object:
   //
   //                 changeTypeParameters: If defined, this allows generic types to be
   //                                       automatically convertible between different subtypes
   //                                       of the same generic type if their type paramters are
   //                                       convertible. For example, if this function is defined
   //                                       on our Pair example above, type A is convertible to type
   //                                       X, and type B is convertible to type Y, then Pair(A, B)
   //                                       will be automatically convertible to Pair(X, Y) by using
   //                                       this function as the conversion function.
   //                                       Only generic types with the same number of type
   //                                       parameters will be set as automatically convertible.
   //
   //                                       If this is defined, it MUST be defined as a function
   //                                       of one argument, taking in only an array of the new type
   //                                       parameters, and returning a new instance of the 
   //                                       converted object of the new type.
   //
   //                 convertToTypeParameter, convertFromTypeParameter:
   //                      These are optional functions that allow concrete subtypes of this generic
   //                      type to be automatically made convertible with their type parameters.
   //                      For example, if this function is defined on our Pair example above,
   //                      then these could be defined to automatically allow Pair(Float, Int) to 
   //                      be convertible to and/or from Float and/or Int.
   //
   //                      convertToTypeParameter must be defined as a function of one argument
   //                      taking in the index of the type parameter this object should be
   //                      converted to, and returning the converted object. In this function, you
   //                      may use "this" to access any properties of the object to be converted.
   //
   //                      convertFromTypeParameter must be defined as a function of two arguments
   //                      taking in the index of the type parameter this object should be
   //                      converted from and the value it should be converted from (which is
   //                      guaranteed to be an object of the same type as the type parameter of the
   //                      given index). It should return the converted object of this generic type.
   //                      In this function, you may use "this" to access any properties of the
   //                      PROTOTYPE of this generic type (e.g. anything defined in this
   //                      implementation object, as well as properties like this.type and this.
   //                      typeParameters, but not anything defined in the init function).
   //
   //                      If these functions are defined, and the corresponding
   //                      canConvertTo/FromTypeParameter functions are not, Atypical will assume
   //                      that this generic type can be converted to or from all of its type
   //                      parameters, and will automatically define canConvertTo/FromTypeParameter
   //                      functions to reflect that.
   //
   //                 canConvertToTypeParameter, canConvertFromTypeParameter:
   //
   //                 The following proeprties MUST NOT be defined on this object:
   //
   //                 type: Will be set to the constructor function of the type of every instance.
   //                 
   //                 genericType: Will be set to the metaconstructor of the generic type of every
   //                              instance.
   //                 
   //                 typeParameters: Will be set to an array of the type parameters this type was 
   //                                 instantiated with.
   AT.defineGenericType = function(implementation) {
      if (typeof implementation.init !== "function") {
         console.error("Initialization function is required when creating a new generic type.");
         return undefined;
      }
      if (typeof implementation.typename !== "string") {
         console.error("Typename string is required when creating a new generic type.");
         return undefined;
      }
      if (!_validateTypename(implementation.typename)) {
         return undefined;
      }

      // Check conversion function between different instances of this generic type
      if (implementation.changeTypeParameters !== undefined
         && !_isFunctionOfNArguments(implementation.changeTypeParameters, 1))
      {
         console.error("Error defining generic types: changeTypeParameters "
            + "must be a function of one argument.");
         return undefined;
      }

      if (implementation.convertToTypeParameter !== undefined) {
         if (!_isFunctionOfNArguments(implementation.convertToTypeParameter, 1)) {
            console.error("Error defining generic types: convertToTypeParameter "
               + "must be a function of one argument taking in only the index.");
            return undefined;
         }

         if (implementation.canConvertToTypeParameter === undefined) {
            // If the user didn't define a restriction function for conversion, define
            // a basic one ourselves.
            implementation.canConvertToTypeParameter = function(index) {
               return index < this.typeParameters.length;
            }
         }
         else if (!_isFunctionOfNArguments(implementation.canConvertToTypeParameter,1)) {
            // If they did, though, validate it.
            console.error("Error defining generic types: canConvertToTypeParameter "
               + "must be a function of one argument taking in only the index.");
            return undefined;
         }
      }
      else {
         // If they didn't define a conversion function, make sure canConvert... always is false.
         implementation.canConvertToTypeParameter = function(index) {
            return false;
         }
      }

      if (implementation.convertFromTypeParameter !== undefined) {
         if(!_isFunctionOfNArguments(implementation.convertFromTypeParameter, 2)) {
            console.error("Error defining generic types: convertFromTypeParameter "
               + "must be a function of two arguments taking in the index and the value "
                  + "to be converted.");
            return undefined;
         }

         if (implementation.canConvertFromTypeParameter === undefined) {
            // If the user didn't define a restriction function for conversion, define
            // a basic one ourselves.
            implementation.canConvertFromTypeParameter = function(index) {
               return index < this.typeParameters.length;
            }
         }
         else if (!_isFunctionOfNArguments(implementation.canConvertFromTypeParameter,1)) {
            // If they did, though, validate it.
            console.error("Error defining generic types: canConvertFromTypeParameter "
               + "must be a function of one argument taking in only the index.");
            return undefined;
         }
      }
      else {
         // If they didn't define a conversion function, make sure canConvert... always is false.
         implementation.canConvertFromTypeParameter = function(index) {
            return false;
         }
      }

      let GenericType = function GenericType() {
         // This function will return a concrete implementation of the generic type,
         // with concrete type parameters.
         let typename = '$' + implementation.typename + '_$';
         let typeParameters = [];
         for (let i = 0; i < arguments.length; i++) {
            if (!AT.typeIsDefined(arguments[i])) {
               console.error('Attempted to construct a generic ' + implementation.typename
                  + ' with a type parameter that is not a type.');
               return undefined;
            }
            typename += arguments[i].name + '$';
            typeParameters.push(arguments[i]);
         }
         typename += '_';

         if (AT.typeIsDefined(typename)) {
            // Already defined, just return it.
            return AT.typeNamed(typename);
         }
         else {
            // First, define the type itself
            let concreteImplementation = {
               typename: typename,
               genericType: GenericType,
               init: implementation.init,
               typeParameters: typeParameters,
            };
            for (let property in implementation) {
               if (concreteImplementation.hasOwnProperty(property)) { continue; }
               concreteImplementation[property] = implementation[property];
            }

            let type = AT.defineType(concreteImplementation);

            // Define conversions between this type and its type parameters where possible
            
            if (implementation.convertToTypeParameter !== undefined) {
               for (let i = 0; i < typeParameters.length; i++) {
                  if (type.prototype.canConvertToTypeParameter(i)) {
                     AT.defineConversion(type, typeParameters[i], function(genericValue) {
                        return genericValue.convertToTypeParameter(i);
                     });
                  }
               }
            }

            if (implementation.convertFromTypeParameter !== undefined) {
               for (let i = 0; i < typeParameters.length; i++) {
                  if (type.prototype.canConvertFromTypeParameter(i)) {
                     AT.defineConversion(typeParameters[i], type, function(parameterValue) {
                        return type.prototype.convertFromTypeParameter(i, parameterValue);
                     });
                  }
               }
            }

            return type;
         }
      }

      _genericTypes[implementation.typename] = GenericType;

      AT[implementation.typename] = GenericType;

      return GenericType;
   };

   // Adds a conversion function to the global list of conversion functions, enabling it to
   // be used with Atypical.Type.convert.
   // If called multiple times with the same types, each call overrides the previous
   // conversion function.
   //
   // sourceType: The name or constructor of the type you're converting from. Must be a type that's
   //             already been defined.
   // destinationType: The name or constructor of the type you're converting to. Must be a type
   //                  that's already been defined.
   // conversionFunction: A function, taking in one argument of the source type, that returns
   //                     a value of the destination type, to be used for conversion.
   AT.defineConversion = function(sourceType, destinationType, conversionFunction) {
      let sourceTypename = _typename(sourceType);
      let destinationTypename = _typename(destinationType);
      if (!( typeof sourceTypename === "string" 
         && typeof destinationTypename === "string"
         && typeof conversionFunction === "function"))
      {
         console.error("Error adding type conversion, incorrect arguments.");
         return;
      }
      if (conversionFunction.length !== 1) {
         console.error("Error adding type conversion, conversion function must be of exactly "
            + "one argument.");
         return;
      }
      if (!_types.hasOwnProperty(sourceTypename)) {
         console.error("Error adding type conversion, source type "
            + sourceTypename + " not defined.");
         return;
      }
      if (!_types.hasOwnProperty(destinationTypename)) {
         console.error("Error adding type conversion, destination type "
            + destinationTypename + " not defined.");
         return;
      }

      _conversions[sourceTypename][destinationTypename] = conversionFunction;

      // If either of these types are an intermediary type for conversions, update the conversion
      // map to account for the fact that this new conversion now exists.
      // In the following comments, call our source and destination types T and U and our newly-
      // defined conversion T -> U.
      
      // Update all conversions T -> U -> V where V has set U as an intermediary from any source.
      for (let i = 0; i < _intermediaryConversionsFromAnySource[destinationTypename].length; i++) {
         let finalTypename = _intermediaryConversionsFromAnySource[destinationTypename][i];
         // Don't override any conversions that have already been created
         if (!AT.canConvert(sourceTypename, finalTypename)) {
            AT.defineConversionsViaIntermediary(
               sourceTypename, destinationTypename, finalTypename);
         }
      }

      // Update all conversions V -> T -> U where V has set T as an intermediary to any destination.
      for (let i = 0; i < _intermediaryConversionsToAnyDestination[sourceTypename].length; i++) {
         let originalTypename = _intermediaryConversionsToAnyDestination[sourceTypename][i]; 
         // Don't override any conversions that have already been created
         if (!AT.canConvert(originalTypename, destinationTypename)) {
            AT.defineConversionsViaIntermediary(
               originalTypename, sourceTypename, destinationTypename);
         }
      }
   };

   // This function allows you to define a conversion between any two types S and D by using
   // type T as an intermediary. That is, when converting S to D, you first convert S to T and
   // then T to D.
   //
   // The arguments correspond to the types as so:
   //
   // sourceType: The name or constructor of the S type as described above, that you'd like to
   //             convert from. Must be a type that has already been defined.
   // intermediaryType: The name or constructor of the T type as described above. Must be a type
   //                   that has already been defined.
   // destinationType: The name or constructor of the D type as described above, that you'd like
   //                  to convert to. Must be a type that has already been defined.
   //
   // This function can be used one of three ways:
   //
   // 1. Defining all of S, T, and D. This adds a single conversion function, S -> D,
   //    by converting S -> T -> D, and requires that conversion functions for S -> T and T -> D
   //    already exist.
   //
   // 2. Defining S and T, but leaving D null. This defines a set of conversion functions S -> D
   //    for EVERY type D that's currently defined and for which a conversion function T -> D exists.
   //
   // 3. Defining T and D, but leaving S null. This defines a set of conversions S -> D for EVERY
   //    type S that's currently defined and for which a conversion S -> T exists.
   //
   // Note that these must be null, not undefined or any other falsy value.
   //
   // If you have already specified a conversion between S and D, this function will overwrite
   // this previously-specified conversion. As such, it's best to call this before defining any
   // special-case custom conversion functions.
   //
   // These intermediary conversions will also attempt to update to reflect any new conversions
   // that are added. E.g. if you set a conversion S -> T -> D for all D, and then define a new
   // type Q, and a new conversion for T -> Q, then the Atypical system will create S -> Q via
   // S -> T -> Q unless a previous S -> Q conversion was already defined.
   AT.defineConversionsViaIntermediary = function(sourceType, intermediaryType, destinationType) {
      let sourceTypename = _typename(sourceType);
      let intermediaryTypename = _typename(intermediaryType);
      let destinationTypename = _typename(destinationType);
      // Whole bunch of error checking, thanks Javascript.
      if (typeof intermediaryTypename !== "string") {
         console.error("Error defining conversion via intermediary, invalid intermediary type.");
      }
      if (!_types.hasOwnProperty(intermediaryTypename)) {
         console.error("Error defining conversion via intermediary, intermediary type "
            + intermediaryTypename + " not defined.");
         return;
      }
      if (intermediaryTypename === destinationTypename) {
         console.error("Error defining conversion via intermediary, destination type and "
            + "intermediary type are identical (" + intermediaryTypename + ")");
         return;
      }
      if (intermediaryTypename === sourceTypename) {
         console.error("Error defining conversion via intermediary, source type and "
            + "intermediary type are identical (" + intermediaryTypename + ")");
         return;
      }
      if (destinationTypename === null && sourceTypename === null) {
         console.error("Error defining conversion via intermediary, source type and destination "
            + "type cannot both be null.")
      }
      if (destinationTypename === sourceTypename) {
         console.error("Error defining conversion via intermediary, source type and "
            + "destination type are identical (" + sourceTypename + ")");
         return;
      }
      
      if (sourceTypename === null) {
         // Define S -> T -> D for all S.
         if (typeof destinationTypename !== "string") {
            console.error("Error defining conversion via intermediary, destination typename must "
               + "be a string or constructor function when sourceTypename is null.");
         }
         if (!_types.hasOwnProperty(destinationTypename)) {
            console.error("Error defining conversion via intermediary, destination type "
               + destinationTypename + " not defined.");
            return;
         }

         let conversionToDestination = _conversionFunction(
            intermediaryTypename, destinationTypename);

         if (!conversionToDestination) {
            console.error("Attempted to set " + intermediaryTypename + " as an intermediary for "
               + "conversions to " + destinationTypename
               + ", but no conversion between the two types exists.");
            return;
         }

         // TODO: rethink this. Probably setting it as explicit conversion is not the best way of doing things.
         for (let sourceTypename in _conversions) {
            if (_conversions[sourceTypename][intermediaryTypename]
               && sourceTypename !== destinationTypename)
            {
               let conversionToIntermediary = _conversionFunction(
                  sourceTypename, intermediaryTypename);

               _conversions[sourceTypename][destinationTypename] = function(value) {
                  return conversionToDestination(conversionToIntermediary(value));
               }
            }
         }

         _intermediaryConversionsFromAnySource[intermediaryTypename].push(destinationTypename);
      }
      else if (destinationTypename === null) {
         // Define S -> T -> D for all D.
         if (typeof sourceTypename !== "string") {
            console.error("Error defining conversion via intermediary, source typename must "
               + "be a string or constructor function when destinationTypename is null.");
         }
         if (!_types.hasOwnProperty(sourceTypename)) {
            console.error("Error defining conversion via intermediary, source type "
               + sourceTypename + " not defined.");
            return;
         }

         let conversionToIntermediary = _conversionFunction(sourceTypename, intermediaryTypename);

         if (!conversionToIntermediary) {
            console.error("Attempted to set " + intermediaryTypename + " as an intermediary for "
               + "conversions from " + sourceTypename
               + ", but no conversion between the two types exists.");
            return;
         }

         for (let destinationTypename in _conversions) {
            if (_conversions[intermediaryTypename][destinationTypename]
               && intermediaryTypename !== destinationTypename)
            {
               let conversionToDestination = _conversionFunction(
                  intermediaryTypename, destinationTypename);

               _conversions[sourceTypename][destinationTypename] = function(value) {
                  return conversionToDestination(conversionToIntermediary(value));
               }
            }
         }

         _intermediaryConversionsToAnyDestination[intermediaryTypename].push(sourceTypename);
      }
      else {
         // Define S -> T -> D for specifc S and D.
         if (typeof sourceTypename !== "string") {
            console.error("Error defining conversion via intermediary, source typename must "
               + "be a string, constructor, or null.");
         }
         if (!_types.hasOwnProperty(sourceTypename)) {
            console.error("Error defining conversion via intermediary, source type "
               + sourceTypename + " not defined.");
            return;
         }
         if (typeof destinationTypename !== "string") {
            console.error("Error defining conversion via intermediary, destination typename must "
               + "be a string, constructor, or null.");
         }
         if (!_types.hasOwnProperty(destinationTypename)) {
            console.error("Error defining conversion via intermediary, destination type "
               + destinationTypename + " not defined.");
            return;
         }

         let conversionToIntermediary = _conversionFunction(sourceTypename, intermediaryTypename);

         if (!conversionToIntermediary) {
            console.error("Attempted to set " + intermediaryTypename + " as an intermediary for "
               + "conversions from " + sourceTypename + " to " + destinationTypename
               + ", but no conversion between " + sourceTypename + " and "
               + intermediaryTypename + " exists.");
            return;
         }

         let conversionToDestination = _conversionFunction(
            intermediaryTypename, destinationTypename);

         if (!conversionToDestination) {
            console.error("Attempted to set " + intermediaryTypename + " as an intermediary for "
               + "conversions from " + sourceTypename + " to " + destinationTypename
               + ", but no conversion between " + intermediaryTypename + " and "
               + destinationTypename + " exists.");
            return;
         }
         _conversions[sourceTypename][destinationTypename] = function(value) {
            return conversionToDestination(conversionToIntermediary(value));
         }
      }
   };

   // Most users can ignore this function. It's used to create a new, "fresh" version of the
   // Atypical module with only the type definitions in this file. This is useful in unit testing
   // Atypical, as it allows you to create a version of the module without any additional type
   // and conversion definitions.
   AT._createTestingModule = AtypicalModuleGenerator;

   // Construction error. Meant to be thrown in a type's constructor if the type was instantiated
   // with incorrect arguments.
   AT.ConstructionError = function(message) { this.init(message); };
   AT.ConstructionError.prototype = {
      init: function(message) {
         this.name = "ConstructionError";
         this.message = (message || "Type was constructed with incorrect arguments");
      }
   };

   // Type definitions start here.

   AT.defineType({
      typename: "String",
      init: function(s) {
         this._def("value", "" + s);
      },
      toPrimitive: function() {
         return this.value;
      }
   });

   AT.defineType({
      typename: "Float",
      init: function(value) {
         if (value === undefined) { value = 0; }
         else if (value instanceof Number) { value = value.valueOf(); }

         if (isNaN(value)) {
            throw new AT.ConstructionError("Float constructed with non-numerical input ("+value+")");
         }
         this._def("value", value);
      },
      toPrimitive: function() {
         return this.value;
      }
   });
   AT.defineConversion(AT.Float, AT.String, function(f) {
      return new AT.String("" + f.value.toFixed(3));
   });
   AT.defineConversion(AT.String, AT.Float, function(str) {
      var num = parseFloat(str.value);
      if (isNaN(num)) {
         return new AT.Float(0);
      }
      else {
         return new AT.Float(num);
      }
   });

   AT.defineType({
      typename: "Vector3",
      init: function(x, y, z) {
         let values = [x, y, z];
         if (x instanceof Array) {
            values = x;
         }

         let keys = ["x", "y", "z"];
         for (let i = 0; i < keys.length; i++) {
            if (values[i] === undefined) {
               this._def(keys[i], 0);
            }
            else if (values[i] instanceof AT.Float) {
               this._def(keys[i], values[i].value);
            }
            else {
               // AT.Float will take care of validating our arguments.
               this._def(keys[i], (new AT.Float(values[i])).value);
            }
         }
      },
      magnitude: function() {
         return sqrt(this.x*this.x + this.y*this.y + this.z*this.z);
      }
   });
   AT.defineConversion(AT.Vector3, AT.Float, function(vec) {
      return new AT.Float(vec.magnitude());
   });
   AT.defineConversion(AT.Float, AT.Vector3, function(r) {
      return new AT.Vector3(new AT.Float(r.value), new AT.Float(r.value), new AT.Float(r.value));
   });
   AT.defineConversion(AT.Vector3, AT.String, function(v) {
      return new AT.String("(" + new AT.Float(v.x).convert("String").value
         + ", " + new AT.Float(v.y).convert("String").value
         + ", " + new AT.Float(v.z).convert("String").value + ")");
   });
   AT.defineConversion(AT.String, AT.Vector3, function(str) {
      let numbers = str.value.split(/[^\d\.\+-eE]/).map(parseFloat).filter(
         function(value) { return !isNaN(value); }
      );
      return new AT.Vector3(numbers[0] || 0, numbers[1] || 0, numbers[2] || 0);
   });

   AT.defineType({
      typename: "Int",
      init: function(value) {
         if (value === undefined) { value = 0; }
         else if (value instanceof Number) { value = value.valueOf(); }

         if (isNaN(value)) {
            throw new AT.ConstructionError("Int constructed with non-numerical input ("+value+")");
         }
         this._def("value", Math.round(value));
      },
      toPrimitive: function() {
         return this.value;
      }
   });
   AT.defineConversion(AT.Float, AT.Int, function(num) {
      try {
         return new AT.Int(num.value);
      }
      catch (error) {
         if (error instanceof AT.ConstructionError) {
            return undefined;
         }
         else {
            throw error;
         }
      }
   });
   AT.defineConversion(AT.Int, AT.Float, function(i) {
      return new AT.Float(i.value);
   });
   AT.defineConversionsViaIntermediary(null, AT.Float, AT.Int);
   AT.defineConversionsViaIntermediary(AT.Int, AT.Float, null);
   // Define a custom conversion to string. The float intermediary already gives us conversion
   // from string for free, but we want our ints to print without decimal places.
   AT.defineConversion(AT.Int, AT.String, function(i) {
      return new AT.String("" + i.value)
   });
   

   AT.defineType({
      typename: "Bool",
      init: function(value) {
         this._def("value", !!value);
      },
      toPrimitive: function() {
         return this.value;
      },
      not: function() {
         return new AT.Bool(!this.value);
      },
      and: function(other) {
         return new AT.Bool(this.value && other.value);
      },
      or: function(other) {
         return new AT.Bool(this.value || other.value);
      },
      xor: function(other) {
         return new AT.Bool(this.value !== other.value);
      }
   });
   AT.defineConversion(AT.Bool, AT.String, function(b) {
      return new AT.String(b.value ? "true" : "false");
   });
   AT.defineConversion(AT.String, AT.Bool, function(str) {
      var lower = str.value.toLowerCase();
      return new AT.Bool(lower !== "false" && lower !== "0" && lower !== "f");
   });
   AT.defineConversion(AT.Int, AT.Bool, function(i) {
      return new AT.Bool(i.value);
   });
   AT.defineConversion(AT.Float, AT.Bool, function(num) {
      return new AT.Bool(Math.abs(num.value) > 0.001);
   });
   AT.defineConversion(AT.Vector3, AT.Bool, function(v) {
      let notZero = (Math.abs(v.x) > 0.001 || Math.abs(v.y) > 0.001 || Math.abs(v.z) > 0.001);
      return new AT.Bool(notZero);
   });
   AT.defineConversion(AT.Bool, AT.Int, function(b) {
      return new AT.Int(b.value ? 1 : 0);
   });
   AT.defineConversion(AT.Bool, AT.Float, function(b) {
      return new AT.Float(b.value ? 1 : 0);
   });
   AT.defineConversion(AT.Bool, AT.Vector3, function(b) {
      return new AT.Vector3(0, b.value ? 1 : 0, 0);
   });


   AT.defineGenericType({
      typename: "Array",
      // TODO: possible utility functions
      // set(index, value) function
      // init(length) function, which inits empty objects
      init: function() {
         let values = null;
         if (arguments.length === 1 && arguments[0] instanceof Array) {
            values = arguments[0];
         }
         else {
            values = Array.from(arguments);
         }

         for (let i = 0; i < values.length; i++) {
            if (!(values[i] instanceof this.typeParameters[0])) {
               values[i] = new (this.typeParameters[0])(values[i]);
            }
         }
         this._def("values", values);
      },
      canConvertToTypeParameter:  function(index) {
         return index === 0;
      },
      canConvertFromTypeParameter: function(index) {
         return index === 0;
      },
      convertToTypeParameter: function(index) {
         return this.values[0];
      },
      convertFromTypeParameter: function(index, value) {
         return new (this.type)([value]);
      },
      changeTypeParameters: function(newTypeParams) {
         return new (this.genericType(newTypeParams[0]))(
            this.values.map(function(value) {
               return value.convert(newTypeParams[0]);
            }
         ));
      },
      get: function(index) {
         return this.values[index];
      },
      toPrimitive: function() {
         return this.values.map(function (value) {
            if (value.isPrimitive()) {
               return value.toPrimitive();
            }
            else {
               return value;
            }
         });
      }
   });
   // Define a few specific conversions for specific subtypes
   AT.defineConversion(AT.Vector3, AT.Array(AT.Float), function (vec3) {
      return new (AT.Array(AT.Float))(vec3.x, vec3.y, vec3.z);
   });
   AT.defineConversion(AT.Array(AT.Float), AT.Vector3, function(arr) {
      return new AT.Vector3(arr.values[0] || 0, arr.values[1] || 0, arr.values[2] || 0);
   });
   // TODO: is it possible to make the last argument there just any AT.Array with a float-compatible type?
   AT.defineConversionsViaIntermediary(AT.Vector3, AT.Array(AT.Float), AT.Array(AT.Int));
   // TODO: same for the first argument here
   AT.defineConversionsViaIntermediary(AT.Array(AT.Int), AT.Array(AT.Float), AT.Vector3);


   return AT;
};

window.Atypical = AtypicalModuleGenerator();

// Convenience alias to make it easier to type.
window.AT = Atypical;

})();
