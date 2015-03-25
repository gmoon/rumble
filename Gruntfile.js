/*global module:false */
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    // Metadata.
    pkg: grunt.file.readJSON('package.json'),
    banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
      '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
      '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
      '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
      ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n',
    // Task configuration.
    copy: {
      main: {
        files: [{
          expand: true,
          src: ['vendor/**'],
          dest: 'dist/',
          cwd: 'app/'
        }, {
          expand: true,
          src: ['*.html'],
          dest: 'dist/',
          cwd: 'app/'
        }]
      },
      cdn: {
        src: 'dist/rumble.html',
        dest: 'dist/standalone/rumble.html',
        options: {
          // Read rumble.html and replace local script and link sources with their CDN equivalents.
          // These are defined in the project.json file (vendor property)
          process: function(content) {
            grunt.log.write("\nCreating dist/standalone/rumble.html with CDN info from package.json vendor data\n");
            // loop through each vendor library in package.json
            grunt.config.get('pkg').vendor.map(function(vendor) {
              var from = '(?:src|href)="(.*' + vendor.lib + '.*)"';
              var fromre = new RegExp(from, "g");
              var match;
              while ((match = fromre.exec(content)) !== null) {
                var local = RegExp.$1;
                grunt.log.write("Replacing " + local + " with " + vendor.cdn + "\n");
                var search = new RegExp(local, "g");
                content = content.replace(search, vendor.cdn);
              }
            });
            return content;
          }
        }
      }
    },
    htmllint: {
      all: {
        options: {
          ignore: [
            /Attribute “(?:ng|sb)-[a-z-]+” not allowed/,
            /Attribute “on” not allowed on element “div”/,
            /\{\{.*\}\}.*: not a URL code point/
          ]
        },
        src: ["app/**/*.html", "tests/**/*.html"]
      }
    },
    concat: {
      options: {
        banner: '<%= banner %>',
        stripBanners: true
      },
      dist: {
        src: ['app/js/*.js'],
        dest: 'dist/js/<%= pkg.name %>.js'
      }
    },
    uglify: {
      options: {
        banner: '<%= banner %>',
        sourceMap: true
      },
      dist: {
        src: '<%= concat.dist.dest %>',
        dest: 'dist/js/<%= pkg.name %>.min.js'
      }
    },
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        unused: true,
        boss: true,
        eqnull: true,
        browser: true,
        globals: {}
      },
      gruntfile: {
        src: 'Gruntfile.js'
      },
      app_test: {
        src: ['app/js/*.js', 'test/**/*.js']
      }
    },
    qunit: {
      files: ['test/**/*.html']
    },
    watch: {
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      },
      lib_test: {
        files: '<%= jshint.lib_test.src %>',
        tasks: ['jshint:lib_test', 'jshint:app_test', 'qunit']
      }
    }
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-html');

  // Default task.
  grunt.registerTask('default', ['jshint', 'concat', 'uglify', 'copy']);
  grunt.registerTask('ci', ['jshint', 'concat', 'uglify', 'copy']);
  grunt.registerTask('test', ['qunit']);
};